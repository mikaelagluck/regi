import 'server-only';
import { z } from 'zod';
import type { Tx } from '@/lib/db';
import type { LogicalDate } from '@/lib/logicalDate';
import { planDateRangeSave, planRecurringSave, recurringConflicts, WEEKDAYS, type SchedulePlan, type TimeOfDay, type Weekday } from '@/lib/schedule';
import { badRequest, notFound } from './api';
import { userAssignments } from './regimens';

export const scheduleInput = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('recurring'), days: z.array(z.enum(WEEKDAYS as [Weekday, ...Weekday[]])).max(7) }),
  z.object({ mode: z.literal('range'), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
]);

async function applyPlan(tx: Tx, userId: string, plan: SchedulePlan) {
  for (const id of plan.deletes) await tx.q('delete from schedule_assignments where id = $1', [id]);
  for (const u of plan.updates) await tx.q('update schedule_assignments set end_date = $2 where id = $1', [u.id, u.end_date]);
  for (const a of plan.inserts) {
    await tx.q(
      `insert into schedule_assignments (user_id, regimen_id, schedule_type, recurrence_rule, start_date, end_date, priority, time_of_day)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, a.regimen_id, a.schedule_type, a.recurrence_rule, a.start_date, a.end_date, a.priority, a.time_of_day],
    );
  }
}

async function regimenTod(tx: Tx, regimenId: string): Promise<TimeOfDay> {
  const r = await tx.one<{ time_of_day: TimeOfDay }>('select time_of_day::text as time_of_day from regimens where id = $1', [regimenId]);
  if (!r) throw notFound('Regimen not found');
  return r.time_of_day;
}

/** POST /regimens/:id/schedule — create/replace (B5.5, C3.5 silent swap). */
export async function saveSchedule(tx: Tx, userId: string, regimenId: string, input: z.infer<typeof scheduleInput>, today: LogicalDate) {
  const timeOfDay = await regimenTod(tx, regimenId);
  const assignments = await userAssignments(tx);
  let plan: SchedulePlan;
  if (input.mode === 'recurring') {
    plan = planRecurringSave(assignments, { regimenId, timeOfDay, days: input.days, today });
  } else {
    if (input.to < input.from) throw badRequest('End date must be on or after the start date');
    plan = planDateRangeSave(assignments, { regimenId, timeOfDay, from: input.from, to: input.to, today });
  }
  await applyPlan(tx, userId, plan);
}

/** DELETE /regimens/:id/schedule — unschedule from today (history kept). */
export async function clearSchedule(tx: Tx, userId: string, regimenId: string, today: LogicalDate) {
  const timeOfDay = await regimenTod(tx, regimenId);
  const assignments = (await userAssignments(tx)).filter((a) => a.regimen_id === regimenId);
  await applyPlan(tx, userId, planRecurringSave(assignments, { regimenId, timeOfDay, days: [], today }));
}

/** [schedule-recurring] "currently: <other regimen>" per weekday. */
export async function scheduleConflicts(tx: Tx, regimenId: string, today: LogicalDate) {
  const timeOfDay = await regimenTod(tx, regimenId);
  const assignments = await userAssignments(tx);
  const byDay = recurringConflicts(assignments, { regimenId, timeOfDay, today });
  const ids = [...new Set(Object.values(byDay))];
  const names = ids.length
    ? await tx.q<{ id: string; name: string }>('select id, name from regimens where id = any($1::uuid[])', [ids])
    : [];
  const nameOf = new Map(names.map((n) => [n.id, n.name]));
  return Object.fromEntries(Object.entries(byDay).map(([d, id]) => [d, nameOf.get(id!) ?? 'another regimen'])) as Partial<Record<Weekday, string>>;
}

/** "replaces your standard morning regimen" — is there a standard regimen in this slot? */
export async function hasStandardInSlot(tx: Tx, regimenId: string, today: LogicalDate) {
  const timeOfDay = await regimenTod(tx, regimenId);
  const assignments = await userAssignments(tx);
  return assignments.some((a) => a.schedule_type === 'standard' && a.time_of_day === timeOfDay && a.regimen_id !== regimenId && (a.end_date === null || a.end_date >= today));
}
