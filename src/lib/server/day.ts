import 'server-only';
import { z } from 'zod';
import type { Tx } from '@/lib/db';
import { addDays, isoWeekday, logicalDate, logicalDateRange, type LogicalDate } from '@/lib/logicalDate';
import { resolveDay, TIMES_OF_DAY, type Assignment, type TimeOfDay } from '@/lib/schedule';
import { STEP_TYPES } from '@/lib/stepTypes';
import { computeCurrentStreak, dayStatus, STREAK_LOOKBACK_DAYS, type DayRecord } from '@/lib/streaks';
import type { CalendarMonth, CheckResult, DayPayload, DayRegimen, DayStep, DaySummary, MonthDay, RegimenStep } from '@/lib/types';
import { badRequest, notFound } from './api';
import { scheduleTimerNotification, cancelTimerNotification } from './notifications';
import { stampStartedOn } from './products';
import { removeStepFrom, stepLabel, stepsOn, updateStepFrom, userAssignments } from './regimens';

export interface DayCtx {
  userId: string;
  timezone: string;
  today: LogicalDate;
  now: Date;
}

interface InstanceRow {
  id: string;
  regimen_id: string;
  date: LogicalDate;
  completed_at: string | null;
  skipped: boolean;
  journal_note: string | null;
}

interface StepInstanceRow {
  id: string;
  regimen_instance_id: string;
  regimen_step_id: string | null;
  override_position: number | null;
  override_label: string | null;
  override_user_product_id: string | null;
  override_step_type: string | null;
  override_wait_seconds: number | null;
  is_added_for_this_day: boolean;
  is_removed_for_this_day: boolean;
  timer_started_at: string | null;
  checked_at: string | null;
  o_brand: string | null;
  o_name: string | null;
  o_step_type: string | null;
}

const TOD_ORDER: Record<TimeOfDay, number> = { morning: 0, midday: 1, evening: 2 };

function composeSteps(template: RegimenStep[], sis: StepInstanceRow[], date: LogicalDate, tz: string): DayStep[] {
  const out: (DayStep & { pos: number })[] = [];
  const retro = (checked: string | null) => !!checked && logicalDate(new Date(checked), tz) > date;
  for (const t of template) {
    const si = sis.find((x) => x.regimen_step_id === t.id);
    if (si?.is_removed_for_this_day) continue;
    const overridden = !!si?.override_user_product_id || !!si?.override_label;
    out.push({
      key: t.id,
      regimen_step_id: t.id,
      step_instance_id: si?.id ?? null,
      label: si?.override_user_product_id ? (si.o_name ?? stepLabel(t)) : (si?.override_label ?? stepLabel(t)),
      brand: overridden ? (si?.o_brand ?? null) : t.brand,
      step_type: (si?.o_step_type ?? t.step_type) as DayStep['step_type'],
      user_product_id: si?.override_user_product_id ?? (overridden ? null : t.user_product_id),
      wait_seconds_after: si?.override_wait_seconds ?? t.wait_seconds_after,
      notes: t.notes,
      checked_at: si?.checked_at ?? null,
      timer_started_at: si?.timer_started_at ?? null,
      retroactive: retro(si?.checked_at ?? null),
      pos: si?.override_position ?? t.position,
    });
  }
  for (const si of sis.filter((x) => !x.regimen_step_id && x.is_added_for_this_day && !x.is_removed_for_this_day)) {
    out.push({
      key: `added:${si.id}`,
      regimen_step_id: null,
      step_instance_id: si.id,
      label: si.o_name ?? si.override_label ?? 'Step',
      brand: si.o_brand,
      step_type: (si.override_step_type ?? si.o_step_type ?? 'apply') as DayStep['step_type'],
      user_product_id: si.override_user_product_id,
      wait_seconds_after: si.override_wait_seconds ?? 0,
      notes: null,
      checked_at: si.checked_at,
      timer_started_at: si.timer_started_at,
      retroactive: retro(si.checked_at),
      pos: si.override_position ?? 999,
    });
  }
  return out.sort((a, b) => a.pos - b.pos).map(({ pos: _pos, ...s }) => s);
}

async function stepInstances(tx: Tx, instanceIds: string[]): Promise<StepInstanceRow[]> {
  if (!instanceIds.length) return [];
  return tx.q<StepInstanceRow>(
    `select si.*, p.brand as o_brand, p.name as o_name, c.step_type::text as o_step_type
       from regimen_step_instances si
       left join user_products p on p.id = si.override_user_product_id
       left join categories c on c.id = p.category_id
      where si.regimen_instance_id = any($1::uuid[])`,
    [instanceIds],
  );
}

/** Everything the Today screen needs for one logical date (C5.2: one request). */
export async function loadDay(tx: Tx, ctx: DayCtx, date: LogicalDate, assignmentsIn?: Assignment[]): Promise<DayPayload> {
  const assignments = assignmentsIn ?? (await userAssignments(tx));
  const resolved = resolveDay(assignments, date);
  const instances = await tx.q<InstanceRow>('select id, regimen_id, date, completed_at, skipped, journal_note from regimen_instances where date = $1', [date]);
  const ids = [...new Set([...Object.values(resolved).map((a) => a!.regimen_id), ...instances.map((i) => i.regimen_id)])];

  const [regimens, steps, sis, counters] = await Promise.all([
    ids.length
      ? tx.q<{ id: string; name: string; time_of_day: TimeOfDay }>('select id, name, time_of_day::text as time_of_day from regimens where id = any($1::uuid[])', [ids])
      : Promise.resolve([]),
    stepsOn(tx, ids, date),
    stepInstances(tx, instances.map((i) => i.id)),
    tx.one<{ current_streak_days: number; lifetime_regimens_completed: number; any_regimen: boolean }>(
      'select current_streak_days, lifetime_regimens_completed, exists(select 1 from regimens where not is_archived) as any_regimen from users where id = $1',
      [ctx.userId],
    ),
  ]);

  const list: DayRegimen[] = regimens
    .map((r) => {
      const inst = instances.find((i) => i.regimen_id === r.id) ?? null;
      const daySteps = composeSteps(
        steps.filter((s) => s.regimen_id === r.id),
        inst ? sis.filter((s) => s.regimen_instance_id === inst.id) : [],
        date,
        ctx.timezone,
      );
      const done = daySteps.filter((s) => s.checked_at).length;
      return {
        regimen_id: r.id,
        name: r.name,
        time_of_day: r.time_of_day,
        instance_id: inst?.id ?? null,
        completed_at: inst?.completed_at ?? null,
        skipped: inst?.skipped ?? false,
        journal_note: inst?.journal_note ?? null,
        steps: daySteps,
        done_count: done,
        total: daySteps.length,
      };
    })
    .sort((a, b) => TOD_ORDER[a.time_of_day] - TOD_ORDER[b.time_of_day])
    .slice(0, 4); // B3.3: max 4 regimens per day

  return {
    date,
    today: ctx.today,
    regimens: list,
    streak: counters?.current_streak_days ?? 0,
    lifetime: counters?.lifetime_regimens_completed ?? 0,
    serverNow: ctx.now.toISOString(),
    hasAnyRegimen: counters?.any_regimen ?? false,
  };
}

async function ensureInstance(tx: Tx, userId: string, regimenId: string, date: LogicalDate): Promise<InstanceRow> {
  const row = await tx.one<InstanceRow>(
    `insert into regimen_instances (regimen_id, user_id, date) values ($1, $2, $3)
     on conflict (regimen_id, date) do update set regimen_id = excluded.regimen_id
     returning id, regimen_id, date, completed_at, skipped, journal_note`,
    [regimenId, userId, date],
  );
  return row!;
}

function assertLoggable(ctx: DayCtx, date: LogicalDate) {
  if (date > ctx.today) throw badRequest("You can't log a day that hasn't happened yet.");
}

async function dayRegimen(tx: Tx, ctx: DayCtx, date: LogicalDate, regimenId: string) {
  const day = await loadDay(tx, ctx, date);
  const r = day.regimens.find((x) => x.regimen_id === regimenId);
  if (!r) throw notFound('That regimen isn’t scheduled on this day');
  return { day, r };
}

/** Upsert the step instance for a template step or an added step and return its id. */
async function upsertStepInstance(tx: Tx, instanceId: string, stepKey: string, set: Record<string, unknown>): Promise<string> {
  const cols = Object.keys(set);
  const vals = Object.values(set);
  if (stepKey.startsWith('added:')) {
    const id = stepKey.slice(6);
    const sets = cols.map((c, i) => `${c} = $${i + 3}`).join(', ');
    const row = await tx.one<{ id: string }>(`update regimen_step_instances set ${sets} where id = $1 and regimen_instance_id = $2 returning id`, [id, instanceId, ...vals]);
    if (!row) throw notFound('Step not found');
    return row.id;
  }
  const insertCols = ['regimen_instance_id', 'regimen_step_id', ...cols];
  const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');
  const updates = cols.map((c) => `${c} = excluded.${c}`).join(', ');
  const row = await tx.one<{ id: string }>(
    `insert into regimen_step_instances (${insertCols.join(', ')}) values (${placeholders})
     on conflict (regimen_instance_id, regimen_step_id) where regimen_step_id is not null do update set ${updates}
     returning id`,
    [instanceId, stepKey, ...vals],
  );
  return row!.id;
}

/** Recompute completion for one instance and the user's counters. Returns the transition. */
async function settle(tx: Tx, ctx: DayCtx, date: LogicalDate, regimenId: string) {
  const { r } = await dayRegimen(tx, ctx, date, regimenId);
  const complete = r.total > 0 && r.done_count === r.total;
  let transitioned: 'completed' | 'uncompleted' | null = null;
  if (complete && !r.completed_at) {
    await tx.q('update regimen_instances set completed_at = $2, skipped = false where id = $1', [r.instance_id, ctx.now.toISOString()]);
    transitioned = 'completed';
  } else if (!complete && r.completed_at) {
    await tx.q('update regimen_instances set completed_at = null where id = $1', [r.instance_id]);
    transitioned = 'uncompleted';
  }
  const before = await tx.one<{ current_streak_days: number; lifetime_regimens_completed: number }>(
    'select current_streak_days, lifetime_regimens_completed from users where id = $1',
    [ctx.userId],
  );
  if (transitioned) {
    // C3.3: atomic UPDATE … RETURNING on the null → set transition (and back, so a re-check can't double count).
    await tx.elevated((e) =>
      e.q('update users set lifetime_regimens_completed = greatest(0, lifetime_regimens_completed + $2) where id = $1 returning lifetime_regimens_completed', [ctx.userId, transitioned === 'completed' ? 1 : -1]),
    );
  }
  const streak = await recomputeStreak(tx, ctx);
  return { r, transitioned, before: before!, streak };
}

export async function setStepChecked(tx: Tx, ctx: DayCtx, date: LogicalDate, regimenId: string, stepKey: string, checked: boolean): Promise<CheckResult> {
  assertLoggable(ctx, date);
  const { r } = await dayRegimen(tx, ctx, date, regimenId);
  const step = r.steps.find((s) => s.key === stepKey);
  if (!step) throw notFound('Step not found');
  const inst = await ensureInstance(tx, ctx.userId, regimenId, date);
  const siId = await upsertStepInstance(tx, inst.id, stepKey, { checked_at: checked ? ctx.now.toISOString() : null, timer_started_at: null });
  await cancelTimerNotification(tx, siId);
  if (checked) await stampStartedOn(tx, step.user_product_id, date);

  const { r: after, transitioned, before, streak } = await settle(tx, ctx, date, regimenId);
  const day = await loadDay(tx, ctx, date);
  const lifetimeAfter = day.lifetime;
  return {
    day,
    completed:
      transitioned === 'completed'
        ? {
            regimen_name: after.name,
            time_of_day: after.time_of_day,
            day_number: streak.dayNumber,
            streak_before: before.current_streak_days,
            streak_after: streak.current,
            lifetime_before: before.lifetime_regimens_completed,
            lifetime_after: lifetimeAfter,
          }
        : null,
  };
}

/** B3.6: start the wait on a step (fill + countdown derive from this timestamp). */
export async function startTimer(tx: Tx, ctx: DayCtx, date: LogicalDate, regimenId: string, stepKey: string): Promise<DayPayload> {
  assertLoggable(ctx, date);
  const { r } = await dayRegimen(tx, ctx, date, regimenId);
  const idx = r.steps.findIndex((s) => s.key === stepKey);
  const step = r.steps[idx];
  if (!step) throw notFound('Step not found');
  if (step.wait_seconds_after <= 0) throw badRequest('This step has no wait');
  const inst = await ensureInstance(tx, ctx.userId, regimenId, date);
  // v1 ships a single active timer in the UI (C8): starting one clears any other running timer today.
  await tx.q('update regimen_step_instances set timer_started_at = null where regimen_instance_id = $1 and timer_started_at is not null', [inst.id]);
  const siId = await upsertStepInstance(tx, inst.id, stepKey, { timer_started_at: ctx.now.toISOString(), checked_at: null });
  await stampStartedOn(tx, step.user_product_id, date);
  const next = r.steps.slice(idx + 1).find((s) => !s.checked_at);
  await scheduleTimerNotification(tx, ctx.userId, siId, new Date(ctx.now.getTime() + step.wait_seconds_after * 1000), step.label, next?.label ?? null);
  return loadDay(tx, ctx, date);
}

export async function setSkipped(tx: Tx, ctx: DayCtx, date: LogicalDate, regimenId: string, skipped: boolean): Promise<DayPayload> {
  assertLoggable(ctx, date);
  await dayRegimen(tx, ctx, date, regimenId);
  const inst = await ensureInstance(tx, ctx.userId, regimenId, date);
  await tx.q('update regimen_instances set skipped = $2 where id = $1', [inst.id, skipped]);
  await recomputeStreak(tx, ctx);
  return loadDay(tx, ctx, date);
}

export async function setJournal(tx: Tx, ctx: DayCtx, date: LogicalDate, regimenId: string, note: string | null): Promise<DayPayload> {
  assertLoggable(ctx, date);
  await dayRegimen(tx, ctx, date, regimenId);
  const inst = await ensureInstance(tx, ctx.userId, regimenId, date);
  await tx.q('update regimen_instances set journal_note = $2 where id = $1', [inst.id, note?.trim() ? note.trim() : null]);
  return loadDay(tx, ctx, date);
}

// ───────── B5.6 edit-scope ─────────

export const editScopeInput = z.object({
  action: z.enum(['skip', 'swap']),
  scope: z.enum(['today', 'forward', 'specific_days']),
  days: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(60).optional(),
  changes: z
    .object({
      user_product_id: z.string().uuid().nullish(),
      free_text_label: z.string().trim().max(120).nullish(),
      step_type: z.enum(STEP_TYPES as [string, ...string[]]).optional(),
      wait_seconds_after: z.number().int().min(0).max(7200).optional(),
    })
    .optional(),
});

export async function editStep(tx: Tx, ctx: DayCtx, date: LogicalDate, regimenId: string, stepKey: string, input: z.infer<typeof editScopeInput>): Promise<DayPayload> {
  const { r } = await dayRegimen(tx, ctx, date, regimenId);
  const step = r.steps.find((s) => s.key === stepKey);
  if (!step) throw notFound('Step not found');
  if (input.action === 'swap' && !input.changes?.user_product_id && !input.changes?.free_text_label) throw badRequest('Pick a product or type a name');

  const perDay = async (d: LogicalDate) => {
    const inst = await ensureInstance(tx, ctx.userId, regimenId, d);
    const set: Record<string, unknown> =
      input.action === 'skip'
        ? { is_removed_for_this_day: true, timer_started_at: null }
        : {
            override_user_product_id: input.changes?.user_product_id ?? null,
            override_label: input.changes?.user_product_id ? null : (input.changes?.free_text_label ?? null),
            ...(input.changes?.wait_seconds_after !== undefined ? { override_wait_seconds: input.changes.wait_seconds_after } : {}),
          };
    await upsertStepInstance(tx, inst.id, stepKey, set);
  };

  if (input.scope === 'today') {
    await perDay(date);
  } else if (input.scope === 'specific_days') {
    // Past days are never mutated: only today and future dates are accepted.
    const days = [...new Set(input.days ?? [])].filter((d) => d >= ctx.today);
    if (!days.length) throw badRequest('Pick at least one day from today on');
    for (const d of days) {
      if (stepKey.startsWith('added:') && d !== date) continue;
      const exists = stepKey.startsWith('added:') || (await stepsOn(tx, [regimenId], d)).some((s) => s.id === stepKey);
      if (exists) await perDay(d);
    }
  } else {
    if (stepKey.startsWith('added:')) {
      await perDay(date);
    } else {
      const from = date > ctx.today ? date : ctx.today;
      const template = (await stepsOn(tx, [regimenId], from)).find((s) => s.id === stepKey);
      if (template) {
        if (input.action === 'skip') await removeStepFrom(tx, template, from);
        else
          await updateStepFrom(
            tx,
            template,
            {
              step_type: input.changes?.step_type ?? template.step_type,
              user_product_id: input.changes?.user_product_id ?? null,
              free_text_label: input.changes?.user_product_id ? null : (input.changes?.free_text_label ?? null),
              wait_seconds_after: input.changes?.wait_seconds_after ?? template.wait_seconds_after,
              notes: template.notes,
            },
            template.position,
            from,
          );
      }
    }
  }
  if (date <= ctx.today) await settle(tx, ctx, date, regimenId).catch(() => null);
  return loadDay(tx, ctx, date);
}

// ───────── C3.3 streaks ─────────

/**
 * Recompute current/longest streak from history (on every write that can change it, and at
 * rollover). Reads stay O(1) from users.current_streak_days.
 */
export async function recomputeStreak(tx: Tx, ctx: Pick<DayCtx, 'userId' | 'today'>) {
  const assignments = await userAssignments(tx);
  const since = addDays(ctx.today, -STREAK_LOOKBACK_DAYS);
  const rows = await tx.q<{ date: LogicalDate; regimen_id: string; completed: boolean; skipped: boolean }>(
    `select date, regimen_id, completed_at is not null as completed, skipped from regimen_instances
      where user_id = $1 and date between $2 and $3`,
    [ctx.userId, since, ctx.today],
  );
  const byDate = new Map<LogicalDate, typeof rows>();
  for (const r of rows) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);
  const earliest = [...assignments.map((a) => a.start_date ?? a.created_at.slice(0, 10)), ...rows.map((r) => r.date)].sort()[0];

  const records: DayRecord[] = [];
  for (let i = 0; i <= STREAK_LOOKBACK_DAYS; i += 1) {
    const d = addDays(ctx.today, -i);
    if (!earliest || d < earliest) break;
    const scheduled = new Set(Object.values(resolveDay(assignments, d)).map((a) => a!.regimen_id));
    const inst = byDate.get(d) ?? [];
    for (const x of inst) scheduled.add(x.regimen_id);
    const status = dayStatus([...scheduled].map((id) => {
      const x = inst.find((y) => y.regimen_id === id);
      return { completed: !!x?.completed, skipped: !!x?.skipped };
    }));
    records.push({ date: d, status });
    if (i > 0 && (status === 'incomplete' || status === 'skipped')) break;
    if (i === 0 && status === 'skipped') break;
  }
  const current = computeCurrentStreak(records, ctx.today);
  const asIfPerfect = computeCurrentStreak(
    records.map((r) => (r.date === ctx.today ? { ...r, status: 'perfect' as const } : r)),
    ctx.today,
  );
  const row = await tx.elevated((e) =>
    e.one<{ current_streak_days: number; longest_streak_days: number }>(
      `update users set current_streak_days = $2, longest_streak_days = greatest(longest_streak_days, $2), streak_evaluated_on = $3
        where id = $1 returning current_streak_days, longest_streak_days`,
      [ctx.userId, current, ctx.today],
    ),
  );
  return { current, longest: row?.longest_streak_days ?? current, dayNumber: Math.max(asIfPerfect, 1) };
}

/** Lazy rollover: if the logical day advanced since the last evaluation, recompute. */
export async function rolloverIfNeeded(tx: Tx, ctx: DayCtx, evaluatedOn: LogicalDate | null) {
  if (evaluatedOn === ctx.today) return;
  await recomputeStreak(tx, ctx);
}

// ───────── B6 calendar ─────────

export async function calendarMonth(tx: Tx, ctx: DayCtx, month: string): Promise<CalendarMonth> {
  const first = `${month}-01`;
  const lastDay = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const last = `${month}-${String(lastDay).padStart(2, '0')}`;
  const assignments = await userAssignments(tx);
  const instances = await tx.q<{ date: LogicalDate; regimen_id: string; completed_at: string | null; skipped: boolean; checked: number }>(
    `select ri.date, ri.regimen_id, ri.completed_at, ri.skipped,
            (select count(*)::int from regimen_step_instances si where si.regimen_instance_id = ri.id and si.checked_at is not null and not si.is_removed_for_this_day) as checked
       from regimen_instances ri where ri.date between $1 and $2`,
    [first, last],
  );
  const tods = await tx.q<{ id: string; time_of_day: TimeOfDay }>('select id, time_of_day::text as time_of_day from regimens');
  const todOf = new Map(tods.map((t) => [t.id, t.time_of_day]));
  const any = await tx.one<{ any: boolean }>('select exists(select 1 from regimen_instances) as any');

  const days: MonthDay[] = logicalDateRange(first, last).map((date) => {
    const future = date > ctx.today;
    if (future) return { date, future, dots: [] };
    const ids = new Set(Object.values(resolveDay(assignments, date)).map((a) => a!.regimen_id));
    const inst = instances.filter((i) => i.date === date);
    for (const i of inst) ids.add(i.regimen_id);
    const dots = [...ids]
      .map((id) => {
        const i = inst.find((x) => x.regimen_id === id);
        const state: MonthDay['dots'][number]['state'] = i?.completed_at ? 'complete' : i?.skipped ? 'skipped' : i && i.checked > 0 ? 'partial' : 'none';
        return { regimen_id: id, time_of_day: todOf.get(id) ?? 'morning', state };
      })
      .sort((a, b) => TOD_ORDER[a.time_of_day] - TOD_ORDER[b.time_of_day]);
    return { date, future, dots };
  });

  const streak = await tx.one<{ s: number }>('select current_streak_days as s from users where id = $1', [ctx.userId]);
  return { month, today: ctx.today, streak: streak?.s ?? 0, days, hasHistory: !!any?.any };
}

export async function daySummary(tx: Tx, ctx: DayCtx, date: LogicalDate): Promise<DaySummary> {
  const day = await loadDay(tx, ctx, date);
  return {
    date,
    today: ctx.today,
    regimens: day.regimens.map((r) => ({ regimen_id: r.regimen_id, name: r.name, time_of_day: r.time_of_day, done: r.done_count, total: r.total, skipped: r.skipped })),
    journal: day.regimens.map((r) => r.journal_note).find(Boolean) ?? null,
  };
}

/** Week strip for Calendar Day view (B6.1): 7 days centred on the date, with dot states. */
export async function weekStrip(tx: Tx, ctx: DayCtx, date: LogicalDate) {
  const offset = isoWeekday(date) - 1;
  const start = addDays(date, -offset);
  const months = [...new Set([start.slice(0, 7), addDays(start, 6).slice(0, 7)])];
  const all = (await Promise.all(months.map((m) => calendarMonth(tx, ctx, m)))).flatMap((m) => m.days);
  return logicalDateRange(start, addDays(start, 6)).map((d) => all.find((x) => x.date === d) ?? { date: d, future: d > ctx.today, dots: [] });
}

export { TIMES_OF_DAY };
