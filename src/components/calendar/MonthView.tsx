import { IconArrowRight, IconChevronLeft, IconChevronRight, IconFlame } from '@tabler/icons-react';
import Link from 'next/link';
import { Dot, DOT_LABEL, ProgressFill } from '@/components/atoms';
import { addDays, formatMonthYear, formatShortDate, isoWeekday, logicalDateRange, type LogicalDate } from '@/lib/logicalDate';
import { TIME_OF_DAY_LABEL, TIME_OF_DAY_SHORT } from '@/lib/schedule';
import type { CalendarMonth, DaySummary } from '@/lib/types';
import { CalendarToggle } from './CalendarToggle';
import s from './MonthView.module.css';

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** [calendar-month] B6.2–B6.4. Dots are shape-coded (B6.3); selected day expands below the grid. */
export function MonthView({ data, selected, summary }: { data: CalendarMonth; selected: LogicalDate; summary: DaySummary | null }) {
  const first = `${data.month}-01`;
  const last = data.days[data.days.length - 1].date;
  const gridStart = addDays(first, -(isoWeekday(first) - 1));
  const gridEnd = addDays(last, 7 - isoWeekday(last));
  const byDate = new Map(data.days.map((d) => [d.date, d]));
  const href = (q: Record<string, string>) => `/calendar?${new URLSearchParams({ view: 'month', ...q })}`;

  return (
    <>
      <header className={s.header}>
        <Link href={href({ month: shiftMonth(data.month, -1) })} className={s.chev} aria-label="Previous month"><IconChevronLeft size={22} aria-hidden /></Link>
        <div className={s.title}>
          <h1 className={s.month}>{formatMonthYear(first)}</h1>
          <span className={s.streak}><IconFlame size={14} aria-hidden className={s.flame} /> {data.streak}-day streak</span>
        </div>
        <Link href={href({ month: shiftMonth(data.month, 1) })} className={s.chev} aria-label="Next month"><IconChevronRight size={22} aria-hidden /></Link>
      </header>

      <div className={s.toggle}><CalendarToggle view="month" date={selected} /></div>

      <div className={s.grid} role="grid" aria-label={formatMonthYear(first)}>
        <div className={s.row} role="row">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => <span key={i} className={s.w} role="columnheader" aria-label={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]}>{w}</span>)}
        </div>
        {Array.from({ length: Math.ceil(logicalDateRange(gridStart, gridEnd).length / 7) }, (_, wk) => (
          <div key={wk} className={s.row} role="row">
            {logicalDateRange(addDays(gridStart, wk * 7), addDays(gridStart, wk * 7 + 6)).map((d) => {
              const day = byDate.get(d);
              if (!day) return <span key={d} className={`${s.cell} ${s.outside}`} role="gridcell" aria-hidden>{Number(d.slice(8))}</span>;
              const isSel = d === selected;
              const isToday = d === data.today;
              const label = `${formatShortDate(d)}${isToday ? ', today' : ''}${day.future ? ', upcoming' : day.dots.length ? `: ${day.dots.map((x) => `${TIME_OF_DAY_LABEL[x.time_of_day]} ${DOT_LABEL[x.state]}`).join(', ')}` : ', nothing scheduled'}`;
              return (
                <Link
                  key={d}
                  href={href({ month: data.month, date: d })}
                  scroll={false}
                  role="gridcell"
                  aria-selected={isSel}
                  aria-label={label}
                  className={[s.cell, day.future ? s.future : '', isSel ? s.selected : '', isToday ? s.today : ''].join(' ')}
                  data-testid={`cal-${d}`}
                >
                  <span className={s.num}>{Number(d.slice(8))}</span>
                  <span className={s.dots}>{day.dots.map((x) => <Dot key={x.regimen_id} state={x.state} size={6} />)}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <ul className={s.legend} aria-label="Dot legend">
        {(['complete', 'partial', 'skipped', 'none'] as const).map((k) => (
          <li key={k}><Dot state={k} size={8} /> {k === 'none' ? 'No data' : k[0].toUpperCase() + k.slice(1)}</li>
        ))}
      </ul>

      {summary && (
        <section className={s.card} aria-label={`Details for ${formatShortDate(summary.date)}`}>
          <div className={s.cardHead}>
            <div>
              <h2 className={s.cardDate}>{formatShortDate(summary.date)}</h2>
              {summary.date === summary.today && <span className="t-caption">Today</span>}
            </div>
            {summary.date <= summary.today && (
              <Link href={`/calendar?view=day&date=${summary.date}`} className={s.open} aria-label={`Open ${formatShortDate(summary.date)}`}>
                {summary.date < summary.today ? 'Log this day' : 'Open'} <IconArrowRight size={16} aria-hidden />
              </Link>
            )}
          </div>
          {summary.regimens.length ? (
            <ul className={s.regs}>
              {summary.regimens.map((r) => (
                <li key={r.regimen_id} className={s.reg}>
                  <div className={s.regHead}>
                    <span className={s.regName}>{TIME_OF_DAY_SHORT[r.time_of_day]} · {r.name}</span>
                    <span className="t-caption">{r.skipped ? 'Skipped' : `${r.done}/${r.total}`}</span>
                  </div>
                  <ProgressFill value={r.total ? r.done / r.total : 0} label={`${r.name}: ${r.done} of ${r.total}`} tone="neutral" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-caption">{summary.date > summary.today ? 'Nothing logged yet.' : 'Nothing scheduled.'}</p>
          )}
          {summary.journal && (
            <div className={s.journal}>
              <span className="t-overline">Journal</span>
              <p className={s.journalText}>“{summary.journal.length > 90 ? `${summary.journal.slice(0, 90)}…` : summary.journal}”</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}
