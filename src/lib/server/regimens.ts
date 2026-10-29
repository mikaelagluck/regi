import 'server-only';
import { z } from 'zod';
import type { Tx } from '@/lib/db';
import { addDays, formatDateRange, type LogicalDate } from '@/lib/logicalDate';
import { parseWeekdays, weekdaySummary, type Assignment } from '@/lib/schedule';
import { STEP_TYPES } from '@/lib/stepTypes';
import type { Regimen, RegimenDetail, RegimenStep, RegimenSummary, ScheduleSummary } from '@/lib/types';
import { notFound } from './api';

// Steps are versioned copy-on-write (regimen_steps.active_from / active_until) so editing a
// template never changes how a past day renders. A step "applies" on date D when
// (active_from is null or active_from <= D) and (active_until is null or D < active_until).

const STEP_SELECT = `
  select st.id, st.regimen_id, st.position, st.user_product_id, st.free_text_label, st.step_type::text as step_type,
         st.wait_seconds_after, st.notes, st.reference_url, st.active_from, st.active_until,
         p.brand, p.name as product_name, p.image_url
    from regimen_steps st left join user_products p on p.id = st.user_product_id`;

export const STEP_ACTIVE_ON = (dateParam: string) =>
  `(st.active_from is null or st.active_from <= ${dateParam}) and (st.active_until is null or ${dateParam} < st.active_until)`;

export async function stepsOn(tx: Tx, regimenIds: string[], date: LogicalDate): Promise<RegimenStep[]> {
  if (!regimenIds.length) return [];
  return tx.q<RegimenStep>(`${STEP_SELECT} where st.regimen_id = any($1::uuid[]) and ${STEP_ACTIVE_ON('$2::date')} order by st.position, st.id`, [regimenIds, date]);
}

export function stepLabel(s: Pick<RegimenStep, 'product_name' | 'free_text_label'>): string {
  return s.product_name ?? s.free_text_label ?? 'Step';
}

export async function userAssignments(tx: Tx): Promise<Assignment[]> {
  return tx.q<Assignment>(
    `select id, regimen_id, schedule_type::text as schedule_type, recurrence_rule, start_date, end_date, priority,
            time_of_day::text as time_of_day, created_at from schedule_assignments order by created_at`,
  );
}

/** Schedule summary as of today (B5.1 row subtitle, B5.2 header). */
export function summarizeSchedule(assignments: Assignment[], regimenId: string, today: LogicalDate): ScheduleSummary {
  const mine = assignments.filter((a) => a.regimen_id === regimenId && (a.end_date === null || a.end_date >= today));
  const temp = mine.find((a) => a.schedule_type === 'temporary');
  if (temp && temp.start_date && temp.end_date) {
    return { mode: 'range', text: 'daily during trip', range: { from: temp.start_date, to: temp.end_date } };
  }
  const days = new Set(mine.filter((a) => a.schedule_type === 'standard').flatMap((a) => parseWeekdays(a.recurrence_rule)));
  if (!days.size) return { mode: 'none', text: 'Not scheduled' };
  return { mode: 'recurring', text: weekdaySummary([...days] as never) };
}

export function rangeLabel(s: ScheduleSummary): string | null {
  return s.range ? formatDateRange(s.range.from, s.range.to) : null;
}

export async function listRegimens(tx: Tx, today: LogicalDate, opts: { archived?: boolean } = {}): Promise<RegimenSummary[]> {
  const rows = await tx.q<Regimen & { step_count: number }>(
    `select r.id, r.name, r.time_of_day::text as time_of_day, r.target_user_label, r.reminder_time::text as reminder_time,
            r.is_archived, r.cloned_from_regimen_id, r.created_at,
            (select count(*)::int from regimen_steps st where st.regimen_id = r.id and ${STEP_ACTIVE_ON('$1::date')}) as step_count
       from regimens r where r.is_archived = $2 order by r.created_at`,
    [today, !!opts.archived],
  );
  const assignments = await userAssignments(tx);
  return rows.map((r) => ({ ...r, schedule: summarizeSchedule(assignments, r.id, today) }));
}

export async function getRegimen(tx: Tx, id: string, date: LogicalDate): Promise<RegimenDetail> {
  const r = await tx.one<Regimen>(
    `select id, name, time_of_day::text as time_of_day, target_user_label, reminder_time::text as reminder_time,
            is_archived, cloned_from_regimen_id, created_at from regimens where id = $1`,
    [id],
  );
  if (!r) throw notFound('Regimen not found');
  const [steps, assignments] = await Promise.all([stepsOn(tx, [id], date), userAssignments(tx)]);
  return { ...r, steps, schedule: summarizeSchedule(assignments, id, date), assignments: assignments.filter((a) => a.regimen_id === id) };
}

export async function targetLabels(tx: Tx): Promise<string[]> {
  const rows = await tx.q<{ l: string }>('select distinct target_user_label as l from regimens where target_user_label is not null order by 1');
  return rows.map((r) => r.l);
}

// ───────── writes ─────────

export const stepInput = z
  .object({
    id: z.string().uuid().optional(),
    step_type: z.enum(STEP_TYPES as [string, ...string[]]),
    user_product_id: z.string().uuid().nullish(),
    free_text_label: z.string().trim().max(120).nullish(),
    wait_seconds_after: z.number().int().min(0).max(7200).default(0),
    notes: z.string().max(1000).nullish(),
  })
  .refine((s) => s.user_product_id || (s.free_text_label && s.free_text_label.length), { message: 'Choose a product or type a name' });
export type StepInput = z.infer<typeof stepInput>;

export const regimenInput = z.object({
  name: z.string().trim().min(1).max(60),
  time_of_day: z.enum(['morning', 'midday', 'evening']),
  target_user_label: z.string().trim().max(40).nullish().transform((v) => (v ? v : null)),
  reminder_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullish(),
  steps: z.array(stepInput).max(30).optional(),
});
export type RegimenInput = z.infer<typeof regimenInput>;

export async function createRegimen(tx: Tx, userId: string, input: RegimenInput, today: LogicalDate): Promise<string> {
  const row = await tx.one<{ id: string }>(
    `insert into regimens (owner_user_id, name, time_of_day, target_user_label, reminder_time) values ($1, $2, $3, $4, $5) returning id`,
    [userId, input.name, input.time_of_day, input.target_user_label ?? null, input.reminder_time ?? null],
  );
  const id = row!.id;
  for (const [i, s] of (input.steps ?? []).entries()) await insertStep(tx, id, s, i, today);
  return id;
}

async function insertStep(tx: Tx, regimenId: string, s: StepInput, position: number, from: LogicalDate) {
  const row = await tx.one<{ id: string }>(
    `insert into regimen_steps (regimen_id, position, user_product_id, free_text_label, step_type, wait_seconds_after, notes, active_from)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [regimenId, position, s.user_product_id ?? null, s.user_product_id ? null : s.free_text_label, s.step_type, s.wait_seconds_after, s.notes ?? null, from],
  );
  return row!.id;
}

function stepChanged(old: RegimenStep, s: StepInput) {
  return (
    (old.user_product_id ?? null) !== (s.user_product_id ?? null) ||
    (old.user_product_id ? null : old.free_text_label) !== (s.user_product_id ? null : (s.free_text_label ?? null)) ||
    old.step_type !== s.step_type ||
    old.wait_seconds_after !== s.wait_seconds_after ||
    (old.notes ?? null) !== (s.notes ?? null)
  );
}

/** True when the step was already in effect before `from` (so editing it in place would rewrite history). */
function appliesBefore(step: Pick<RegimenStep, 'active_from'>, from: LogicalDate) {
  return step.active_from === null || step.active_from < from;
}

/** Edit a step effective from `from`. Copy-on-write when the old version applied to earlier days. */
export async function updateStepFrom(tx: Tx, old: RegimenStep, s: StepInput, position: number, from: LogicalDate): Promise<string> {
  if (!stepChanged(old, s)) {
    if (old.position !== position) await tx.q('update regimen_steps set position = $2 where id = $1', [old.id, position]);
    return old.id;
  }
  if (appliesBefore(old, from)) {
    await tx.q('update regimen_steps set active_until = $2 where id = $1', [old.id, from]);
    return insertStep(tx, old.regimen_id, s, position, from);
  }
  await tx.q(
    `update regimen_steps set position = $2, user_product_id = $3, free_text_label = $4, step_type = $5, wait_seconds_after = $6, notes = $7 where id = $1`,
    [old.id, position, s.user_product_id ?? null, s.user_product_id ? null : s.free_text_label, s.step_type, s.wait_seconds_after, s.notes ?? null],
  );
  return old.id;
}

export async function removeStepFrom(tx: Tx, step: RegimenStep, from: LogicalDate) {
  if (appliesBefore(step, from)) await tx.q('update regimen_steps set active_until = $2 where id = $1', [step.id, from]);
  else await tx.q('delete from regimen_steps where id = $1', [step.id]);
}

/** Builder save (B5.3): update properties and replace the step list, effective today. */
export async function updateRegimen(tx: Tx, id: string, input: Partial<RegimenInput>, today: LogicalDate) {
  const current = await getRegimen(tx, id, today);
  await tx.q(
    `update regimens set name = coalesce($2, name), time_of_day = coalesce($3::time_of_day, time_of_day),
            target_user_label = case when $4::boolean then $5 else target_user_label end,
            reminder_time = case when $6::boolean then $7::time else reminder_time end
      where id = $1`,
    [id, input.name ?? null, input.time_of_day ?? null, input.target_user_label !== undefined, input.target_user_label ?? null, input.reminder_time !== undefined, input.reminder_time ?? null],
  );
  if (input.time_of_day && input.time_of_day !== current.time_of_day) {
    // Keep C2.8 "time_of_day must match regimen's" for schedules that still apply.
    await tx.q(`update schedule_assignments set time_of_day = $2 where regimen_id = $1 and (end_date is null or end_date >= $3)`, [id, input.time_of_day, today]);
  }
  if (input.steps) {
    const keep = new Set(input.steps.map((s) => s.id).filter(Boolean));
    for (const old of current.steps) if (!keep.has(old.id)) await removeStepFrom(tx, old, today);
    for (const [i, s] of input.steps.entries()) {
      const old = s.id ? current.steps.find((x) => x.id === s.id) : undefined;
      if (old) await updateStepFrom(tx, old, s, i, today);
      else await insertStep(tx, id, s, i, today);
    }
  }
}

export async function addStep(tx: Tx, regimenId: string, s: StepInput, today: LogicalDate) {
  const r = await getRegimen(tx, regimenId, today);
  return insertStep(tx, regimenId, s, r.steps.length, today);
}

export async function reorderSteps(tx: Tx, regimenId: string, order: string[], today: LogicalDate) {
  // Position changes apply in place (they don't change what was done on a past day).
  const r = await getRegimen(tx, regimenId, today);
  const ids = new Set(r.steps.map((s) => s.id));
  for (const [i, sid] of order.filter((x) => ids.has(x)).entries()) {
    await tx.q('update regimen_steps set position = $2 where id = $1 and regimen_id = $3', [sid, i, regimenId]);
  }
}

/** Archive: hide from lists and stop scheduling from today; history keeps rendering. */
export async function setArchived(tx: Tx, id: string, archived: boolean, today: LogicalDate) {
  const res = await tx.q('update regimens set is_archived = $2 where id = $1 returning id', [id, archived]);
  if (!res.length) throw notFound('Regimen not found');
  if (archived) {
    await tx.q('delete from schedule_assignments where regimen_id = $1 and start_date >= $2', [id, today]);
    await tx.q(
      'update schedule_assignments set end_date = $2 where regimen_id = $1 and (end_date is null or end_date >= $2)',
      [id, addDays(today, -1)],
    );
  }
}
