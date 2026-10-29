import { describe, expect, it } from 'vitest';
import { defaultRegimenIndex, formatCountdown, formatWait, timerState } from '@/lib/timer';

describe('timerState derives everything from timer_started_at', () => {
  const start = Date.parse('2026-05-07T12:00:00Z');
  it('just tapped', () => {
    const t = timerState(new Date(start).toISOString(), 300, start + 1000);
    expect(t.remainingSeconds).toBe(299);
    expect(t.fraction).toBeCloseTo(1 / 300);
    expect(t.done).toBe(false);
  });
  it('halfway', () => {
    const t = timerState(new Date(start).toISOString(), 300, start + 150_000);
    expect(t.fraction).toBeCloseTo(0.5);
    expect(formatCountdown(t.remainingSeconds)).toBe('2:30');
  });
  it('reopening after completion shows done, not catching up', () => {
    const t = timerState(new Date(start).toISOString(), 300, start + 3_600_000);
    expect(t).toMatchObject({ done: true, fraction: 1, remainingSeconds: 0 });
  });
  it('clock skew before start clamps to 0', () => {
    expect(timerState(new Date(start).toISOString(), 300, start - 5000).fraction).toBe(0);
  });
});

describe('formatting', () => {
  it('formatCountdown', () => {
    expect(formatCountdown(299)).toBe('4:59');
    expect(formatCountdown(5)).toBe('0:05');
    expect(formatCountdown(3600)).toBe('60:00');
  });
  it('formatWait', () => {
    expect(formatWait(60)).toBe('1 min');
    expect(formatWait(300)).toBe('5 min');
    expect(formatWait(90)).toBe('1 min 30 sec');
    expect(formatWait(45)).toBe('45 sec');
  });
});

describe('defaultRegimenIndex — B3.4', () => {
  it('shows morning until complete, then the next regimen', () => {
    expect(defaultRegimenIndex([{ completed: false }, { completed: false }])).toBe(0);
    expect(defaultRegimenIndex([{ completed: true }, { completed: false }])).toBe(1);
  });
  it('all complete → last regimen', () => {
    expect(defaultRegimenIndex([{ completed: true }, { completed: true }])).toBe(1);
  });
  it('no regimens → -1', () => expect(defaultRegimenIndex([])).toBe(-1));
});
