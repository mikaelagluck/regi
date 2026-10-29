import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { formatMonthYear, type LogicalDate } from '@/lib/logicalDate';
import s from './CalendarEmpty.module.css';

/** [empty-calendar] B2.2 — faded scaffold of the grid; no CTA, fills naturally as days are logged. */
export function CalendarEmpty({ today }: { today: LogicalDate }) {
  return (
    <div className={s.wrap}>
      <header className={s.header}>
        <span className={s.chev} aria-hidden><IconChevronLeft size={22} /></span>
        <div className={s.title}>
          <span className={s.month}>{formatMonthYear(today)}</span>
          <span className="t-caption">Calendar</span>
        </div>
        <span className={s.chev} aria-hidden><IconChevronRight size={22} /></span>
      </header>
      <div className={s.grid} aria-hidden>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className={s.w}>{d}</span>)}
        {Array.from({ length: 35 }, (_, i) => <span key={i} className={s.cell} />)}
      </div>
      <div className={s.copy}>
        <h2 className={s.headline}>Your history starts now</h2>
        <p className={s.body}>Log your regimens for a few days and you&apos;ll see your patterns here.</p>
      </div>
    </div>
  );
}
