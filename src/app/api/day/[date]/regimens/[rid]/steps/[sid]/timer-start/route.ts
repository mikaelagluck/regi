import { authed } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { dateParam } from '@/lib/server/dateParam';
import { startTimer } from '@/lib/server/day';

export const POST = authed<{ date: string; rid: string; sid: string }>(async ({ profile, params }) =>
  withDay(profile, (tx, ctx) => startTimer(tx, ctx, dateParam(params.date), params.rid, decodeURIComponent(params.sid))),
);
