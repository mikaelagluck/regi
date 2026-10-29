'use client';
import { IconBell, IconCheck } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button, Pill, PillGroup, TextField, TopBar } from '@/components/atoms';
import { api } from '@/lib/client/api';
import { addDays, daysBetween, formatMonthYear, isoWeekday, logicalDateRange, type LogicalDate } from '@/lib/logicalDate';
import { DAY_LONG, TIME_OF_DAY_LABEL, WEEKDAYS, type TimeOfDay, type Weekday } from '@/lib/schedule';
import s from './ScheduleScreen.module.css';

interface Props {
  regimen: { id: string; name: string; time_of_day: TimeOfDay; reminder_time: string | null };
  isNew: boolean;
  today: LogicalDate;
  initial: { mode: 'recurring' | 'range'; days: Weekday[]; from: LogicalDate | null; to: LogicalDate | null };
  conflicts: Partial<Record<Weekday, string>>;
}

/** [schedule-recurring] / [schedule-range] — B5.5 Step 2: Schedule, with C3.5 silent conflict swap. */
export function ScheduleScreen({ regimen, isNew, today, initial, conflicts }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState(initial.mode);
  const [days, setDays] = useState<Weekday[]>(initial.days);
  const [from, setFrom] = useState<LogicalDate>(initial.from ?? today);
  const [to, setTo] = useState<LogicalDate>(initial.to ?? addDays(today, 6));
  const [reminder, setReminder] = useState(regimen.reminder_time?.slice(0, 5) ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const tod = TIME_OF_DAY_LABEL[regimen.time_of_day];
  const rangeOk = to >= from;
  const canSave = mode === 'recurring' ? true : rangeOk;

  async function save() {
    setBusy(true);
    setError(undefined);
    try {
      await api(`/api/regimens/${regimen.id}/schedule`, { body: mode === 'recurring' ? { mode, days } : { mode, from, to } });
      if ((reminder || null) !== (regimen.reminder_time?.slice(0, 5) ?? null)) {
        await api(`/api/regimens/${regimen.id}`, { method: 'PATCH', body: { reminder_time: reminder || null } });
      }
      router.replace(`/regimens/${regimen.id}${isNew ? '?toast=saved' : ''}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className={s.screen}>
      <TopBar back={{ label: 'Back' }} trailing={isNew ? <span className={s.stepOf}>Step 2 of 2</span> : undefined} title={isNew ? undefined : 'Edit schedule'} />
      <div className={s.body}>
        <header>
          <h1 className={s.title}>When does this run?</h1>
          <p className="t-caption">{regimen.name} · {tod}</p>
        </header>

        <PillGroup label="Schedule type">
          <Pill active={mode === 'recurring'} onClick={() => setMode('recurring')}>Recurring</Pill>
          <Pill active={mode === 'range'} onClick={() => setMode('range')}>Date range</Pill>
        </PillGroup>
        <p className={s.helper}>Recurring runs on the same weekdays each week. Use date range for trips, short stints, or one-offs.</p>

        {mode === 'recurring' ? (
          <ul className={s.days} aria-label="Weekdays">
            {WEEKDAYS.map((d) => {
              const on = days.includes(d);
              const other = conflicts[d];
              return (
                <li key={d}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    className={`${s.day} ${on ? s.dayOn : ''}`}
                    onClick={() => setDays((x) => (on ? x.filter((y) => y !== d) : [...x, d]))}
                    aria-describedby={other && !on ? `c-${d}` : undefined}
                  >
                    <span className={s.letter} aria-hidden>{DAY_LONG[d][0]}</span>
                    <span className={s.dayText}>
                      <span className={s.dayName}>{DAY_LONG[d]}</span>
                      {other && !on && <span id={`c-${d}`} className={s.conflict}>currently: {other}</span>}
                    </span>
                    {on && <IconCheck size={18} stroke={2.4} aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={s.range}>
            <div className={s.dates}>
              <TextField label="From" type="date" value={from} min={today} onChange={(e) => e.target.value && setFrom(e.target.value)} />
              <TextField label="To" type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} error={rangeOk ? undefined : 'Must be on or after From'} />
            </div>
            <MiniCalendar from={from} to={to} onPick={(d) => (d < from || (from !== to && d > to) ? (setFrom(d), setTo(d)) : setTo(d))} />
            {rangeOk && (
              <p className={s.helper} aria-live="polite">
                {daysBetween(from, to) + 1} day{daysBetween(from, to) === 0 ? '' : 's'} · replaces your standard {tod.toLowerCase()} regimen for those days only
              </p>
            )}
          </div>
        )}

        <div className={s.reminder}>
          <IconBell size={18} aria-hidden />
          <TextField label="Reminder" optional type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} hint="We'll nudge you at this time on scheduled days." />
        </div>
        {error && <p role="alert" className={s.error}>{error}</p>}
      </div>
      <div className={s.footer}>
        <Button variant="primary" block onClick={save} disabled={!canSave} loading={busy}>Save regimen</Button>
      </div>
    </div>
  );
}

function MiniCalendar({ from, to, onPick }: { from: LogicalDate; to: LogicalDate; onPick: (d: LogicalDate) => void }) {
  const month = from.slice(0, 7);
  const grid = useMemo(() => {
    // Whole weeks from the start of `from`'s month through the later of month-end and `to`.
    const first = `${month}-01`;
    const start = addDays(first, -(isoWeekday(first) - 1));
    const monthEnd = addDays(`${addDays(first, 32).slice(0, 7)}-01`, -1);
    const last = to > monthEnd ? to : monthEnd;
    return logicalDateRange(start, addDays(last, 7 - isoWeekday(last)));
  }, [month, to]);
  return (
    <div className={s.cal} aria-label={`Selected ${from} to ${to}`}>
      <div className={s.calHead}>{formatMonthYear(from)}</div>
      <div className={s.calGrid} role="grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => <span key={i} className={s.calW} aria-hidden>{w}</span>)}
        {grid.map((d) => {
          const inRange = d >= from && d <= to;
          const edge = d === from || d === to;
          return (
            <button key={d} type="button" className={`${s.calD} ${inRange ? s.inRange : ''} ${edge ? s.edge : ''} ${d.slice(0, 7) !== month ? s.out : ''}`} onClick={() => onPick(d)} aria-pressed={inRange} aria-label={d}>
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
