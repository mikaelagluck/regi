import { CalendarEmpty } from '@/components/calendar/CalendarEmpty';
import { CalendarToggle } from '@/components/calendar/CalendarToggle';
import { MonthView } from '@/components/calendar/MonthView';
import { WeekStrip } from '@/components/calendar/WeekStrip';
import { TodayScreen } from '@/components/today/TodayScreen';
import { requireProfile } from '@/lib/auth/session';
import { isLogicalDate } from '@/lib/logicalDate';
import { withDay } from '@/lib/server/context';
import { calendarMonth, daySummary, loadDay, weekStrip } from '@/lib/server/day';
import s from './calendar.module.css';

export const metadata = { title: 'Calendar' };

/** B6 — Day view (= Today for any date, with a week strip) and Month view. */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; month?: string; date?: string }> }) {
  const { profile } = await requireProfile();
  const sp = await searchParams;
  const view = sp.view === 'day' ? 'day' : 'month';

  if (view === 'day') {
    const { day, week } = await withDay(profile, async (tx, ctx) => {
      const date = isLogicalDate(sp.date) ? sp.date : ctx.today;
      return { day: await loadDay(tx, ctx, date), week: await weekStrip(tx, ctx, date) };
    });
    return (
      <TodayScreen
        key={`${day.date}:${day.serverNow}`}
        initial={day}
        basePath="/calendar?view=day"
        header={
          <>
            <div className={s.toggle}><CalendarToggle view="day" date={day.date} /></div>
            <WeekStrip days={week} selected={day.date} today={day.today} />
          </>
        }
      />
    );
  }

  const data = await withDay(profile, async (tx, ctx) => {
    const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : ctx.today.slice(0, 7);
    const cal = await calendarMonth(tx, ctx, month);
    const selected = isLogicalDate(sp.date) && sp.date.startsWith(month) ? sp.date : ctx.today.startsWith(month) ? ctx.today : `${month}-01`;
    return { cal, selected, summary: cal.hasHistory ? await daySummary(tx, ctx, selected) : null, today: ctx.today };
  });
  if (!data.cal.hasHistory) return <CalendarEmpty today={data.today} />;
  return <MonthView data={data.cal} selected={data.selected} summary={data.summary} />;
}
