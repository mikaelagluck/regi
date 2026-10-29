// Streak math (PRD C3.3). Pure; the server recomputes the denormalized counter on every write
// that can change it and at rollover, so reads stay O(1) (C5.2).

import { addDays, daysBetween, type LogicalDate } from './logicalDate';

export type DayStatusValue = 'perfect' | 'incomplete' | 'skipped' | 'none';
export interface DayRecord {
  date: LogicalDate;
  status: DayStatusValue;
}

/** Status of one logical day from its scheduled regimens. */
export function dayStatus(regimens: { completed: boolean; skipped: boolean }[]): DayStatusValue {
  if (regimens.length === 0) return 'none';
  if (regimens.some((r) => r.skipped)) return 'skipped';
  return regimens.every((r) => r.completed) ? 'perfect' : 'incomplete';
}

/** How far back the server looks when recomputing. */
export const STREAK_LOOKBACK_DAYS = 730;

/**
 * Consecutive perfect days ending today.
 * - Today counts if perfect; an in-progress today doesn't break the streak; a skip today does.
 * - A past day that wasn't perfect (incomplete or skipped) ends the streak.
 * - Days with nothing scheduled neither break nor extend it.
 */
export function computeCurrentStreak(records: DayRecord[], today: LogicalDate): number {
  const byDate = new Map(records.map((r) => [r.date, r.status]));
  const oldest = records.reduce<LogicalDate | null>((m, r) => (m === null || r.date < m ? r.date : m), null);
  if (oldest === null) return 0;

  let streak = 0;
  const span = Math.min(daysBetween(oldest, today), STREAK_LOOKBACK_DAYS);
  for (let i = 0; i <= span; i += 1) {
    const date = addDays(today, -i);
    const status = byDate.get(date) ?? 'none';
    if (status === 'perfect') streak += 1;
    else if (status === 'none') continue;
    else if (i === 0 && status === 'incomplete') continue;
    else break;
  }
  return streak;
}

export function nextLongest(longest: number, current: number): number {
  return Math.max(longest, current);
}
