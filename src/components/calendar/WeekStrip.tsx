import Link from 'next/link';
import { Dot, DOT_LABEL } from '@/components/atoms';
import { formatShortDate, type LogicalDate } from '@/lib/logicalDate';
import type { MonthDay } from '@/lib/types';
import s from './WeekStrip.module.css';

/** B6.1 Day view: horizontal strip of the surrounding week; each pill = date + completion dots. */
export function WeekStrip({ days, selected, today }: { days: MonthDay[]; selected: LogicalDate; today: LogicalDate }) {
  return (
    <nav className={s.strip} aria-label="Week">
      {days.map((d) => {
        const sel = d.date === selected;
        return (
          <Link
            key={d.date}
            href={`/calendar?view=day&date=${d.date}`}
            scroll={false}
            className={[s.day, sel ? s.sel : '', d.date === today ? s.today : '', d.future ? s.future : ''].join(' ')}
            aria-current={sel ? 'date' : undefined}
            aria-label={`${formatShortDate(d.date)}${d.dots.length ? `: ${d.dots.map((x) => DOT_LABEL[x.state]).join(', ')}` : ''}`}
          >
            <span className={s.dow}>{formatShortDate(d.date).slice(0, 1)}</span>
            <span className={s.num}>{Number(d.date.slice(8))}</span>
            <span className={s.dots}>{d.dots.map((x) => <Dot key={x.regimen_id} state={x.state} size={5} />)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
