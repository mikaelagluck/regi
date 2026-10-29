import { CalendarEmpty } from '@/components/calendar/CalendarEmpty';
import { requireProfile } from '@/lib/auth/session';
import { withDay } from '@/lib/server/context';

export const metadata = { title: 'Calendar' };

export default async function CalendarPage() {
  const { profile } = await requireProfile();
  const today = await withDay(profile, async (_tx, ctx) => ctx.today);
  return <CalendarEmpty today={today} />;
}
