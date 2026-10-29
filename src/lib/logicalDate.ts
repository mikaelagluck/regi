// The one shared logical-date helper (PRD C3.1, CLAUDE.md). Used by server and client.
//
// PRD: logical_date = (now − 4h).date() in the user's local timezone.
// We apply the 4-hour shift to the *local wall clock* (local hour < 4 → previous calendar date),
// not to the absolute instant. Subtracting 4 absolute hours is wrong on DST days: at 4:00am on
// spring-forward day only 3 real hours have passed since midnight. See tests/unit/logicalDate.test.ts.

export const ROLLOVER_HOUR = 4;

/** A logical date as an ISO calendar date string, e.g. "2026-05-07". */
export type LogicalDate = string;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Local calendar date + hour for an instant in a timezone. */
export function localParts(now: Date, timeZone: string): { date: LogicalDate; hour: number } {
  const tz = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  const parts = Object.fromEntries(formatter(tz).formatToParts(now).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}

export function logicalDate(now: Date, timeZone: string): LogicalDate {
  const { date, hour } = localParts(now, timeZone);
  return hour < ROLLOVER_HOUR ? addDays(date, -1) : date;
}

function toUtcMs(d: LogicalDate): number {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
}

function fromUtcMs(ms: number): LogicalDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(d: LogicalDate, n: number): LogicalDate {
  return fromUtcMs(toUtcMs(d) + n * 86_400_000);
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: LogicalDate, b: LogicalDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / 86_400_000);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(d: LogicalDate): number {
  const w = new Date(toUtcMs(d)).getUTCDay();
  return w === 0 ? 7 : w;
}

/** Inclusive list of dates from → to (empty if to < from). */
export function logicalDateRange(from: LogicalDate, to: LogicalDate): LogicalDate[] {
  const n = daysBetween(from, to);
  return n < 0 ? [] : Array.from({ length: n + 1 }, (_, i) => addDays(from, i));
}

export function isLogicalDate(s: unknown): s is LogicalDate {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toUtcMs(s));
}

/** Date-only value as a UTC Date (for rrule and display formatting). */
export function logicalDateToUtc(d: LogicalDate): Date {
  return new Date(toUtcMs(d));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** "Thu, May 7" */
export function formatShortDate(d: LogicalDate): string {
  const [, m, day] = d.split('-').map(Number);
  return `${WEEKDAYS[isoWeekday(d) - 1]}, ${MONTHS[m - 1]} ${day}`;
}

/** "May 7" */
export function formatMonthDay(d: LogicalDate): string {
  const [, m, day] = d.split('-').map(Number);
  return `${MONTHS[m - 1]} ${day}`;
}

/** "May 2026" */
export function formatMonthYear(d: LogicalDate): string {
  const [y, m] = d.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** "May 12–19" or "Apr 28–May 3" */
export function formatDateRange(from: LogicalDate, to: LogicalDate): string {
  const [, m1, d1] = from.split('-').map(Number);
  const [, m2, d2] = to.split('-').map(Number);
  return m1 === m2 ? `${MONTHS[m1 - 1]} ${d1}–${d2}` : `${MONTHS[m1 - 1]} ${d1}–${MONTHS[m2 - 1]} ${d2}`;
}
