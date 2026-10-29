// Schedule resolution (PRD C3.2) and recurring-schedule conflict handling (C3.5).
// Pure functions over plain rows so server, client and tests share them.
//
// History is inviolate: saving a schedule never rewrites what already ran. Assignments that
// started before today are end-dated at yesterday and a replacement starts today.

import { RRule, rrulestr } from 'rrule';
import { addDays, isoWeekday, logicalDateRange, logicalDateToUtc, type LogicalDate } from './logicalDate';

export type TimeOfDay = 'morning' | 'midday' | 'evening';
export const TIMES_OF_DAY: TimeOfDay[] = ['morning', 'midday', 'evening'];
export type ScheduleType = 'standard' | 'temporary';
export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';
export const WEEKDAYS: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export interface Assignment {
  id: string;
  regimen_id: string;
  schedule_type: ScheduleType;
  recurrence_rule: string;
  start_date: LogicalDate | null;
  end_date: LogicalDate | null;
  priority: number;
  time_of_day: TimeOfDay;
  created_at: string;
}

export type AssignmentInsert = Omit<Assignment, 'id' | 'created_at'>;

export const STANDARD_PRIORITY = 0;
export const TEMPORARY_PRIORITY = 10;

export function weeklyRule(days: Weekday[]): string {
  const sorted = WEEKDAYS.filter((d) => days.includes(d));
  return `FREQ=WEEKLY;BYDAY=${sorted.join(',')}`;
}

export function dailyRule(): string {
  return 'FREQ=DAILY';
}

/** Weekdays a rule fires on (DAILY → all seven). */
export function parseWeekdays(rule: string): Weekday[] {
  if (/FREQ=DAILY/.test(rule) && !/BYDAY=/.test(rule)) return [...WEEKDAYS];
  const m = /BYDAY=([A-Z,]+)/.exec(rule);
  if (!m) return [];
  const set = new Set(m[1].split(','));
  return WEEKDAYS.filter((d) => set.has(d));
}

const ruleCache = new Map<string, RRule | null>();
const EPOCH = '2000-01-03'; // a Monday, so weekly INTERVALs without a start date are stable

function compiled(rule: string, start: LogicalDate | null): RRule | null {
  const key = `${start ?? ''}|${rule}`;
  if (ruleCache.has(key)) return ruleCache.get(key)!;
  let r: RRule | null = null;
  try {
    const parsed = rrulestr(`RRULE:${rule.replace(/^RRULE:/, '')}`, {
      dtstart: logicalDateToUtc(start ?? EPOCH),
    });
    r = parsed instanceof RRule ? parsed : null;
  } catch {
    r = null;
  }
  ruleCache.set(key, r);
  return r;
}

/** Does the RRULE fire on this date? (date window checks are separate) */
export function ruleMatches(rule: string, date: LogicalDate, start: LogicalDate | null): boolean {
  const simple = /^FREQ=(WEEKLY|DAILY)(;BYDAY=[A-Z,]+)?$/.exec(rule);
  if (simple) {
    // Fast path for the two shapes the app writes.
    if (start && date < start) return false;
    return parseWeekdays(rule).includes(WEEKDAYS[isoWeekday(date) - 1]);
  }
  const r = compiled(rule, start);
  if (!r) return false;
  const day = logicalDateToUtc(date);
  return r.between(day, new Date(day.getTime() + 86_399_000), true).length > 0;
}

export function inWindow(a: Pick<Assignment, 'start_date' | 'end_date'>, date: LogicalDate): boolean {
  return (a.start_date === null || a.start_date <= date) && (a.end_date === null || date <= a.end_date);
}

function byPriority(x: Assignment, y: Assignment): number {
  return y.priority - x.priority || (y.created_at < x.created_at ? -1 : y.created_at > x.created_at ? 1 : 0);
}

export function resolveSlot(assignments: Assignment[], date: LogicalDate, slot: TimeOfDay): Assignment | undefined {
  return assignments
    .filter((a) => a.time_of_day === slot && inWindow(a, date) && ruleMatches(a.recurrence_rule, date, a.start_date))
    .sort(byPriority)[0];
}

export type ResolvedDay = Partial<Record<TimeOfDay, Assignment>>;

export function resolveDay(assignments: Assignment[], date: LogicalDate): ResolvedDay {
  const out: ResolvedDay = {};
  for (const slot of TIMES_OF_DAY) {
    const hit = resolveSlot(assignments, date, slot);
    if (hit) out[slot] = hit;
  }
  return out;
}

export function resolveRange(assignments: Assignment[], from: LogicalDate, to: LogicalDate): Record<LogicalDate, ResolvedDay> {
  const out: Record<LogicalDate, ResolvedDay> = {};
  for (const d of logicalDateRange(from, to)) out[d] = resolveDay(assignments, d);
  return out;
}

/** Still applies on/after today (includes future-starting assignments). */
function activeFrom(a: Assignment, today: LogicalDate): boolean {
  return a.end_date === null || a.end_date >= today;
}

/** C3.5: for each weekday, which other regimen's standard schedule currently claims it. */
export function recurringConflicts(
  assignments: Assignment[],
  opts: { regimenId: string; timeOfDay: TimeOfDay; today: LogicalDate },
): Partial<Record<Weekday, string>> {
  const out: Partial<Record<Weekday, string>> = {};
  for (const a of assignments.filter(
    (x) => x.schedule_type === 'standard' && x.time_of_day === opts.timeOfDay && x.regimen_id !== opts.regimenId && activeFrom(x, opts.today),
  )) {
    for (const d of parseWeekdays(a.recurrence_rule)) out[d] ??= a.regimen_id;
  }
  return out;
}

export interface SchedulePlan {
  deletes: string[];
  updates: { id: string; end_date: LogicalDate }[];
  inserts: AssignmentInsert[];
}

function retire(a: Assignment, today: LogicalDate, plan: SchedulePlan) {
  if (a.start_date !== null && a.start_date >= today) plan.deletes.push(a.id);
  else plan.updates.push({ id: a.id, end_date: addDays(today, -1) });
}

/**
 * Save a recurring weekday schedule for a regimen. Selecting a weekday another regimen holds at
 * the same time of day silently moves it (C3.5) — the other regimen keeps its remaining days.
 */
export function planRecurringSave(
  assignments: Assignment[],
  opts: { regimenId: string; timeOfDay: TimeOfDay; days: Weekday[]; today: LogicalDate },
): SchedulePlan {
  const { regimenId, timeOfDay, days, today } = opts;
  const plan: SchedulePlan = { deletes: [], updates: [], inserts: [] };
  const live = assignments.filter((a) => activeFrom(a, today));

  for (const a of live.filter((x) => x.regimen_id === regimenId)) retire(a, today, plan);

  for (const a of live.filter(
    (x) => x.regimen_id !== regimenId && x.schedule_type === 'standard' && x.time_of_day === timeOfDay,
  )) {
    const held = parseWeekdays(a.recurrence_rule);
    if (!held.some((d) => days.includes(d))) continue;
    retire(a, today, plan);
    const remaining = held.filter((d) => !days.includes(d));
    if (remaining.length) {
      plan.inserts.push({
        regimen_id: a.regimen_id,
        schedule_type: 'standard',
        recurrence_rule: weeklyRule(remaining),
        start_date: a.start_date !== null && a.start_date > today ? a.start_date : today,
        end_date: a.end_date,
        priority: a.priority,
        time_of_day: a.time_of_day,
      });
    }
  }

  if (days.length) {
    plan.inserts.push({
      regimen_id: regimenId,
      schedule_type: 'standard',
      recurrence_rule: weeklyRule(days),
      start_date: today,
      end_date: null,
      priority: STANDARD_PRIORITY,
      time_of_day: timeOfDay,
    });
  }
  return plan;
}

/** Date-range mode: replaces the regimen's schedule with one temporary DAILY window. */
export function planDateRangeSave(
  assignments: Assignment[],
  opts: { regimenId: string; timeOfDay: TimeOfDay; from: LogicalDate; to: LogicalDate; today: LogicalDate },
): SchedulePlan {
  const plan: SchedulePlan = { deletes: [], updates: [], inserts: [] };
  for (const a of assignments.filter((x) => x.regimen_id === opts.regimenId && activeFrom(x, opts.today))) {
    retire(a, opts.today, plan);
  }
  plan.inserts.push({
    regimen_id: opts.regimenId,
    schedule_type: 'temporary',
    recurrence_rule: dailyRule(),
    start_date: opts.from,
    end_date: opts.to,
    priority: TEMPORARY_PRIORITY,
    time_of_day: opts.timeOfDay,
  });
  return plan;
}

const DAY_SHORT: Record<Weekday, string> = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };
export const DAY_LONG: Record<Weekday, string> = { MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday', FR: 'Friday', SA: 'Saturday', SU: 'Sunday' };

/** "Mon, Wed, Fri" · "Every day" · "Weekdays" */
export function weekdaySummary(days: Weekday[]): string {
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && !days.includes('SA') && !days.includes('SU')) return 'Weekdays';
  if (days.length === 2 && days.includes('SA') && days.includes('SU')) return 'Weekends';
  return WEEKDAYS.filter((d) => days.includes(d)).map((d) => DAY_SHORT[d]).join(', ');
}

export const TIME_OF_DAY_LABEL: Record<TimeOfDay, string> = { morning: 'Morning', midday: 'Midday', evening: 'Evening' };
export const TIME_OF_DAY_SHORT: Record<TimeOfDay, string> = { morning: 'AM', midday: 'Midday', evening: 'PM' };
