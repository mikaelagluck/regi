import { ScheduleScreen } from '@/components/regimens/ScheduleScreen';
import { requireProfile } from '@/lib/auth/session';
import { parseWeekdays, WEEKDAYS, type Weekday } from '@/lib/schedule';
import { withDay } from '@/lib/server/context';
import { orNotFound } from '@/lib/server/pages';
import { getRegimen } from '@/lib/server/regimens';
import { scheduleConflicts } from '@/lib/server/schedule';

export const metadata = { title: 'Schedule' };

export default async function SchedulePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { profile } = await requireProfile();
  const { id } = await params;
  const isNew = (await searchParams).new === '1';
  const { r, conflicts, today } = await orNotFound(
    withDay(profile, async (tx, ctx) => ({ r: await getRegimen(tx, id, ctx.today), conflicts: await scheduleConflicts(tx, id, ctx.today), today: ctx.today })),
  );
  const live = r.assignments.filter((a) => a.end_date === null || a.end_date >= today);
  const temp = live.find((a) => a.schedule_type === 'temporary');
  const current = [...new Set(live.filter((a) => a.schedule_type === 'standard').flatMap((a) => parseWeekdays(a.recurrence_rule)))] as Weekday[];
  // New regimens: preselect every weekday no other regimen holds (never silently steal days by default).
  const days = isNew && !live.length ? WEEKDAYS.filter((d) => !conflicts[d]) : current;
  return (
    <ScheduleScreen
      regimen={{ id: r.id, name: r.name, time_of_day: r.time_of_day, reminder_time: r.reminder_time }}
      isNew={isNew}
      today={today}
      initial={{ mode: temp ? 'range' : 'recurring', days, from: temp?.start_date ?? null, to: temp?.end_date ?? null }}
      conflicts={conflicts}
    />
  );
}
