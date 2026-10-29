import { authed, badRequest } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { calendarMonth } from '@/lib/server/day';

/** Calendar month with per-day dot states in one query set (C5.2: no N+1). */
export const GET = authed<{ month: string }>(async ({ profile, params }) => {
  if (!/^\d{4}-\d{2}$/.test(params.month)) throw badRequest('month must be YYYY-MM');
  return withDay(profile, (tx, ctx) => calendarMonth(tx, ctx, params.month));
});
