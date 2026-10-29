import { TodayScreen } from '@/components/today/TodayScreen';
import { requireProfile } from '@/lib/auth/session';
import { isLogicalDate } from '@/lib/logicalDate';
import { withDay } from '@/lib/server/context';
import { loadDay } from '@/lib/server/day';

export const metadata = { title: 'Today' };

/** [today-01] — the default route (B1.2). One server round trip for everything on screen (C5.2). */
export default async function TodayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { profile } = await requireProfile();
  const { date } = await searchParams;
  const day = await withDay(profile, (tx, ctx) => loadDay(tx, ctx, isLogicalDate(date) ? date : ctx.today));
  return <TodayScreen key={`${day.date}:${day.serverNow}`} initial={day} />;
}
