import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isoWeekday, logicalDate, logicalDateRange } from '@/lib/logicalDate';

const NY = 'America/New_York';
const LON = 'Europe/London';

describe('logicalDate — 4am rollover on the local wall clock', () => {
  it('returns the same calendar date after 4am', () => {
    expect(logicalDate(new Date('2026-05-07T12:00:00Z'), NY)).toBe('2026-05-07'); // 08:00 EDT
    expect(logicalDate(new Date('2026-05-07T08:00:00Z'), NY)).toBe('2026-05-07'); // 04:00 EDT exactly
  });

  it('returns the previous date between midnight and 4am', () => {
    expect(logicalDate(new Date('2026-05-07T04:00:00Z'), NY)).toBe('2026-05-06'); // 00:00 EDT
    expect(logicalDate(new Date('2026-05-07T07:59:59Z'), NY)).toBe('2026-05-06'); // 03:59:59 EDT
  });

  it('treats 11:59pm as the same day', () => {
    expect(logicalDate(new Date('2026-05-08T03:59:00Z'), NY)).toBe('2026-05-07'); // 23:59 EDT May 7
  });

  it('crosses month and year boundaries', () => {
    expect(logicalDate(new Date('2026-01-01T05:30:00Z'), NY)).toBe('2025-12-31'); // 00:30 EST Jan 1
    expect(logicalDate(new Date('2026-03-01T06:00:00Z'), NY)).toBe('2026-02-28'); // 01:00 EST Mar 1
  });

  describe('US spring-forward (2026-03-08, 2am → 3am)', () => {
    it('3:59am is still the previous logical day', () => {
      // 03:59 EDT = 07:59 UTC
      expect(logicalDate(new Date('2026-03-08T07:59:00Z'), NY)).toBe('2026-03-07');
    });
    it('4:00am starts the new logical day even though only 3 real hours passed since midnight', () => {
      // 04:00 EDT = 08:00 UTC. Naive "subtract 4 absolute hours" would wrongly give 03-07.
      expect(logicalDate(new Date('2026-03-08T08:00:00Z'), NY)).toBe('2026-03-08');
    });
    it('1:30am (before the jump) is the previous logical day', () => {
      expect(logicalDate(new Date('2026-03-08T06:30:00Z'), NY)).toBe('2026-03-07'); // 01:30 EST
    });
  });

  describe('US fall-back (2026-11-01, 2am → 1am)', () => {
    it('both 1:30am occurrences are the previous logical day', () => {
      expect(logicalDate(new Date('2026-11-01T05:30:00Z'), NY)).toBe('2026-10-31'); // 01:30 EDT
      expect(logicalDate(new Date('2026-11-01T06:30:00Z'), NY)).toBe('2026-10-31'); // 01:30 EST
    });
    it('3:59am is still the previous logical day (5 real hours after midnight)', () => {
      // 03:59 EST = 08:59 UTC. Naive subtraction would wrongly give 11-01.
      expect(logicalDate(new Date('2026-11-01T08:59:00Z'), NY)).toBe('2026-10-31');
    });
    it('4:00am starts the new logical day', () => {
      expect(logicalDate(new Date('2026-11-01T09:00:00Z'), NY)).toBe('2026-11-01');
    });
  });

  describe('EU DST (London, 2026-03-29 and 2026-10-25)', () => {
    it('spring-forward 3:59 BST → previous day; 4:00 → same day', () => {
      expect(logicalDate(new Date('2026-03-29T02:59:00Z'), LON)).toBe('2026-03-28');
      expect(logicalDate(new Date('2026-03-29T03:00:00Z'), LON)).toBe('2026-03-29');
    });
    it('fall-back 3:59 GMT → previous day; 4:00 → same day', () => {
      expect(logicalDate(new Date('2026-10-25T03:59:00Z'), LON)).toBe('2026-10-24');
      expect(logicalDate(new Date('2026-10-25T04:00:00Z'), LON)).toBe('2026-10-25');
    });
  });

  it('depends on the user timezone, not the server timezone', () => {
    const instant = new Date('2026-05-07T02:00:00Z');
    expect(logicalDate(instant, 'UTC')).toBe('2026-05-06'); // 02:00 UTC
    expect(logicalDate(instant, 'Asia/Tokyo')).toBe('2026-05-07'); // 11:00 JST
    expect(logicalDate(instant, 'America/Los_Angeles')).toBe('2026-05-06'); // 19:00 PDT May 6
  });

  it('falls back to UTC for an invalid timezone', () => {
    expect(logicalDate(new Date('2026-05-07T12:00:00Z'), 'Not/AZone')).toBe('2026-05-07');
  });
});

describe('date helpers', () => {
  it('addDays handles month/year/leap boundaries', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08'); // DST day is still one calendar day
  });
  it('isoWeekday is 1=Mon … 7=Sun', () => {
    expect(isoWeekday('2026-05-04')).toBe(1);
    expect(isoWeekday('2026-05-10')).toBe(7);
  });
  it('daysBetween and logicalDateRange are inclusive and DST-safe', () => {
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(30);
    expect(logicalDateRange('2026-05-12', '2026-05-19')).toHaveLength(8);
    expect(logicalDateRange('2026-05-19', '2026-05-12')).toEqual([]);
  });
});
