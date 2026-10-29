import { describe, expect, it } from 'vitest';
import { computeCurrentStreak, dayStatus, nextLongest, type DayRecord } from '@/lib/streaks';

const R = (completed: boolean, skipped = false) => ({ completed, skipped });

describe('dayStatus', () => {
  it('nothing scheduled → none', () => expect(dayStatus([])).toBe('none'));
  it('all complete → perfect', () => expect(dayStatus([R(true), R(true)])).toBe('perfect'));
  it('any incomplete → incomplete', () => expect(dayStatus([R(true), R(false)])).toBe('incomplete'));
  it('any skipped → skipped (even if others complete)', () => expect(dayStatus([R(true), R(false, true)])).toBe('skipped'));
});

describe('computeCurrentStreak — C3.3', () => {
  const today = '2026-05-07';
  const days = (map: Record<string, DayRecord['status']>): DayRecord[] =>
    Object.entries(map).map(([date, status]) => ({ date, status }));

  it('counts consecutive perfect days ending yesterday while today is in progress', () => {
    const d = days({ '2026-05-07': 'incomplete', '2026-05-06': 'perfect', '2026-05-05': 'perfect', '2026-05-04': 'incomplete' });
    expect(computeCurrentStreak(d, today)).toBe(2);
  });

  it('adds today once today becomes perfect', () => {
    const d = days({ '2026-05-07': 'perfect', '2026-05-06': 'perfect' });
    expect(computeCurrentStreak(d, today)).toBe(2);
  });

  it('a skip today resets to 0 immediately', () => {
    const d = days({ '2026-05-07': 'skipped', '2026-05-06': 'perfect' });
    expect(computeCurrentStreak(d, today)).toBe(0);
  });

  it('after rollover an imperfect yesterday resets to 0', () => {
    // logical day advanced to 05-08; 05-07 never completed
    const d = days({ '2026-05-08': 'incomplete', '2026-05-07': 'incomplete', '2026-05-06': 'perfect' });
    expect(computeCurrentStreak(d, '2026-05-08')).toBe(0);
  });

  it('days with nothing scheduled neither break nor extend the streak', () => {
    const d = days({ '2026-05-07': 'perfect', '2026-05-06': 'none', '2026-05-05': 'perfect', '2026-05-04': 'skipped' });
    expect(computeCurrentStreak(d, today)).toBe(2);
  });

  it('missing dates are treated as nothing scheduled', () => {
    const d = days({ '2026-05-07': 'perfect', '2026-05-04': 'perfect', '2026-05-03': 'incomplete' });
    expect(computeCurrentStreak(d, today)).toBe(2);
  });

  it('ignores records after today (future instances)', () => {
    const d = days({ '2026-05-09': 'perfect', '2026-05-07': 'perfect' });
    expect(computeCurrentStreak(d, today)).toBe(1);
  });

  it('retroactively completing a past day repairs the streak', () => {
    const before = days({ '2026-05-07': 'perfect', '2026-05-06': 'incomplete', '2026-05-05': 'perfect' });
    const after = days({ '2026-05-07': 'perfect', '2026-05-06': 'perfect', '2026-05-05': 'perfect' });
    expect(computeCurrentStreak(before, today)).toBe(1);
    expect(computeCurrentStreak(after, today)).toBe(3);
  });

  it('empty history → 0', () => expect(computeCurrentStreak([], today)).toBe(0));
});

describe('nextLongest', () => {
  it('is max(longest, current)', () => {
    expect(nextLongest(5, 3)).toBe(5);
    expect(nextLongest(5, 6)).toBe(6);
  });
});
