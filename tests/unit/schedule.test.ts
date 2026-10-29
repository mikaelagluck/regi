import { describe, expect, it } from 'vitest';
import {
  type Assignment,
  dailyRule,
  parseWeekdays,
  planDateRangeSave,
  planRecurringSave,
  recurringConflicts,
  resolveDay,
  resolveRange,
  ruleMatches,
  weeklyRule,
} from '@/lib/schedule';

let seq = 0;
function a(p: Partial<Assignment> & Pick<Assignment, 'regimen_id'>): Assignment {
  seq += 1;
  return {
    id: `a${seq}`,
    schedule_type: 'standard',
    recurrence_rule: weeklyRule(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']),
    start_date: null,
    end_date: null,
    priority: 0,
    time_of_day: 'morning',
    created_at: `2026-01-01T00:00:${String(seq).padStart(2, '0')}Z`,
    ...p,
  };
}

describe('rules', () => {
  it('weeklyRule / parseWeekdays round-trip in canonical order', () => {
    expect(weeklyRule(['FR', 'MO', 'WE'])).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR');
    expect(parseWeekdays('FREQ=WEEKLY;BYDAY=MO,WE,FR')).toEqual(['MO', 'WE', 'FR']);
    expect(parseWeekdays(dailyRule())).toEqual(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);
  });

  it('weekly rule matches only its weekdays', () => {
    const r = 'FREQ=WEEKLY;BYDAY=MO,WE,FR';
    expect(ruleMatches(r, '2026-05-04', null)).toBe(true); // Mon
    expect(ruleMatches(r, '2026-05-05', null)).toBe(false); // Tue
    expect(ruleMatches(r, '2026-05-08', null)).toBe(true); // Fri
    expect(ruleMatches(r, '2026-05-10', null)).toBe(false); // Sun
  });

  it('daily rule matches every day from its start', () => {
    expect(ruleMatches('FREQ=DAILY', '2026-05-12', '2026-05-12')).toBe(true);
    expect(ruleMatches('FREQ=DAILY', '2026-05-15', '2026-05-12')).toBe(true);
  });

  it('respects INTERVAL relative to the start date', () => {
    expect(ruleMatches('FREQ=DAILY;INTERVAL=2', '2026-05-14', '2026-05-12')).toBe(true);
    expect(ruleMatches('FREQ=DAILY;INTERVAL=2', '2026-05-13', '2026-05-12')).toBe(false);
  });

  it('treats an unparseable rule as non-matching instead of throwing', () => {
    expect(ruleMatches('garbage', '2026-05-12', null)).toBe(false);
  });
});

describe('resolveDay — C3.2', () => {
  const daily = a({ regimen_id: 'daily-am', recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR' });
  const tret = a({ regimen_id: 'tret-am', recurrence_rule: 'FREQ=WEEKLY;BYDAY=TU,TH' });
  const pm = a({ regimen_id: 'daily-pm', time_of_day: 'evening' });
  const travel = a({
    regimen_id: 'travel-am',
    schedule_type: 'temporary',
    recurrence_rule: 'FREQ=DAILY',
    start_date: '2026-05-12',
    end_date: '2026-05-19',
    priority: 10,
  });
  const all = [daily, tret, pm, travel];

  it('resolves one regimen per slot from weekday rules', () => {
    const mon = resolveDay(all, '2026-05-04');
    expect(mon.morning?.regimen_id).toBe('daily-am');
    expect(mon.midday).toBeUndefined();
    expect(mon.evening?.regimen_id).toBe('daily-pm');
    expect(resolveDay(all, '2026-05-05').morning?.regimen_id).toBe('tret-am');
  });

  it('temporary schedule overrides standard inside its range only', () => {
    expect(resolveDay(all, '2026-05-11').morning?.regimen_id).toBe('daily-am'); // Mon before
    expect(resolveDay(all, '2026-05-12').morning?.regimen_id).toBe('travel-am'); // Tue, first day
    expect(resolveDay(all, '2026-05-13').morning?.regimen_id).toBe('travel-am'); // Wed (daily-am would match)
    expect(resolveDay(all, '2026-05-19').morning?.regimen_id).toBe('travel-am'); // last day inclusive
    expect(resolveDay(all, '2026-05-20').morning?.regimen_id).toBe('daily-am'); // Wed after
  });

  it('temporary override is per slot — evening keeps its standard regimen', () => {
    expect(resolveDay(all, '2026-05-13').evening?.regimen_id).toBe('daily-pm');
  });

  it('respects start/end dates on standard schedules', () => {
    const ended = a({ regimen_id: 'old', start_date: '2026-01-01', end_date: '2026-04-30' });
    const fresh = a({ regimen_id: 'new', start_date: '2026-05-01' });
    expect(resolveDay([ended, fresh], '2026-04-30').morning?.regimen_id).toBe('old');
    expect(resolveDay([ended, fresh], '2026-05-01').morning?.regimen_id).toBe('new');
  });

  it('breaks priority ties by most recently created', () => {
    const older = a({ regimen_id: 'older' });
    const newer = a({ regimen_id: 'newer' });
    expect(resolveDay([older, newer], '2026-05-04').morning?.regimen_id).toBe('newer');
  });

  it('higher priority wins regardless of creation order', () => {
    const temp = a({ regimen_id: 't', schedule_type: 'temporary', recurrence_rule: 'FREQ=DAILY', start_date: '2026-05-01', end_date: '2026-05-31', priority: 10 });
    const std = a({ regimen_id: 's' });
    expect(resolveDay([temp, std], '2026-05-04').morning?.regimen_id).toBe('t');
  });

  it('resolveRange returns every date inclusive', () => {
    const r = resolveRange(all, '2026-05-10', '2026-05-13');
    expect(Object.keys(r)).toEqual(['2026-05-10', '2026-05-11', '2026-05-12', '2026-05-13']);
    expect(r['2026-05-10'].morning).toBeUndefined(); // Sunday: no AM rule
  });
});

describe('recurring save + silent conflict swap — C3.5', () => {
  const today = '2026-05-07'; // Thu

  it('reports conflicts per weekday from other standard schedules at the same time of day', () => {
    const tret = a({ regimen_id: 'tret', recurrence_rule: 'FREQ=WEEKLY;BYDAY=TU,TH' });
    const pm = a({ regimen_id: 'pm', time_of_day: 'evening', recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO' });
    const ended = a({ regimen_id: 'gone', recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO', end_date: '2026-05-01' });
    const temp = a({ regimen_id: 'trip', schedule_type: 'temporary', recurrence_rule: 'FREQ=DAILY', start_date: '2026-05-12', end_date: '2026-05-19', priority: 10 });
    const c = recurringConflicts([tret, pm, ended, temp], { regimenId: 'daily', timeOfDay: 'morning', today });
    expect(c).toEqual({ TU: 'tret', TH: 'tret' });
  });

  it('new regimen: creates one standard assignment starting today', () => {
    const plan = planRecurringSave([], { regimenId: 'daily', timeOfDay: 'morning', days: ['MO', 'WE', 'FR'], today });
    expect(plan.deletes).toEqual([]);
    expect(plan.updates).toEqual([]);
    expect(plan.inserts).toEqual([
      { regimen_id: 'daily', schedule_type: 'standard', recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR', start_date: today, end_date: null, priority: 0, time_of_day: 'morning' },
    ]);
  });

  it('selecting a conflicting day removes it from the other regimen without touching its past', () => {
    const tret = a({ regimen_id: 'tret', recurrence_rule: 'FREQ=WEEKLY;BYDAY=TU,TH', start_date: '2026-04-01' });
    const plan = planRecurringSave([tret], { regimenId: 'daily', timeOfDay: 'morning', days: ['MO', 'TU'], today });
    // tret's old assignment ends yesterday (history preserved) and continues on TH only from today.
    expect(plan.updates).toEqual([{ id: tret.id, end_date: '2026-05-06' }]);
    expect(plan.inserts).toContainEqual(expect.objectContaining({ regimen_id: 'tret', recurrence_rule: 'FREQ=WEEKLY;BYDAY=TH', start_date: today }));
    expect(plan.inserts).toContainEqual(expect.objectContaining({ regimen_id: 'daily', recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,TU' }));
    // After the plan, Tuesday resolves to daily, Thursday still to tret, and last Tuesday (history) to tret.
    const after = applyPlan([tret], plan);
    expect(resolveDay(after, '2026-05-12').morning?.regimen_id).toBe('daily');
    expect(resolveDay(after, '2026-05-14').morning?.regimen_id).toBe('tret');
    expect(resolveDay(after, '2026-05-05').morning?.regimen_id).toBe('tret');
  });

  it('taking every day from another regimen ends it without inserting an empty rule', () => {
    const tret = a({ regimen_id: 'tret', recurrence_rule: 'FREQ=WEEKLY;BYDAY=TU', start_date: '2026-04-01' });
    const plan = planRecurringSave([tret], { regimenId: 'daily', timeOfDay: 'morning', days: ['TU'], today });
    expect(plan.inserts.filter((i) => i.regimen_id === 'tret')).toEqual([]);
    expect(plan.updates).toEqual([{ id: tret.id, end_date: '2026-05-06' }]);
  });

  it('assignments that start today or later are deleted rather than end-dated', () => {
    const mine = a({ regimen_id: 'daily', recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO', start_date: today });
    const plan = planRecurringSave([mine], { regimenId: 'daily', timeOfDay: 'morning', days: ['FR'], today });
    expect(plan.deletes).toEqual([mine.id]);
    expect(plan.updates).toEqual([]);
  });

  it('editing your own schedule end-dates the old rule and leaves other slots alone', () => {
    const mine = a({ regimen_id: 'daily', recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO', start_date: '2026-04-01' });
    const pm = a({ regimen_id: 'pm', time_of_day: 'evening', recurrence_rule: 'FREQ=WEEKLY;BYDAY=FR' });
    const plan = planRecurringSave([mine, pm], { regimenId: 'daily', timeOfDay: 'morning', days: ['FR'], today });
    expect(plan.updates).toEqual([{ id: mine.id, end_date: '2026-05-06' }]);
    expect(plan.inserts).toHaveLength(1);
  });

  it('clearing all days unschedules the regimen', () => {
    const mine = a({ regimen_id: 'daily', recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO', start_date: '2026-04-01' });
    const plan = planRecurringSave([mine], { regimenId: 'daily', timeOfDay: 'morning', days: [], today });
    expect(plan.inserts).toEqual([]);
    expect(plan.updates).toEqual([{ id: mine.id, end_date: '2026-05-06' }]);
  });
});

describe('date-range save', () => {
  it('creates a priority-10 DAILY temporary assignment and retires the regimen\'s standard rule', () => {
    const today = '2026-05-07';
    const mine = a({ regimen_id: 'travel', recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO', start_date: '2026-04-01' });
    const plan = planDateRangeSave([mine], { regimenId: 'travel', timeOfDay: 'morning', from: '2026-05-12', to: '2026-05-19', today });
    expect(plan.updates).toEqual([{ id: mine.id, end_date: '2026-05-06' }]);
    expect(plan.inserts).toEqual([
      { regimen_id: 'travel', schedule_type: 'temporary', recurrence_rule: 'FREQ=DAILY', start_date: '2026-05-12', end_date: '2026-05-19', priority: 10, time_of_day: 'morning' },
    ]);
  });
});

function applyPlan(list: Assignment[], plan: ReturnType<typeof planRecurringSave>): Assignment[] {
  const out = list
    .filter((x) => !plan.deletes.includes(x.id))
    .map((x) => {
      const u = plan.updates.find((y) => y.id === x.id);
      return u ? { ...x, end_date: u.end_date } : x;
    });
  for (const ins of plan.inserts) out.push(a(ins));
  return out;
}
