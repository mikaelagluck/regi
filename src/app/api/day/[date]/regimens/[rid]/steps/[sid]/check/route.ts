import { authed } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { dateParam } from '@/lib/server/dateParam';
import { setStepChecked } from '@/lib/server/day';

type P = { date: string; rid: string; sid: string };

export const POST = authed<P>(async ({ profile, params }) =>
  withDay(profile, (tx, ctx) => setStepChecked(tx, ctx, dateParam(params.date), params.rid, decodeURIComponent(params.sid), true)),
);

export const DELETE = authed<P>(async ({ profile, params }) =>
  withDay(profile, (tx, ctx) => setStepChecked(tx, ctx, dateParam(params.date), params.rid, decodeURIComponent(params.sid), false)),
);
