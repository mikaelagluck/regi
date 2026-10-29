import { authed } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { dateParam } from '@/lib/server/dateParam';
import { loadDay } from '@/lib/server/day';

export const GET = authed<{ date: string }>(async ({ profile, params }) => withDay(profile, (tx, ctx) => loadDay(tx, ctx, dateParam(params.date))));
