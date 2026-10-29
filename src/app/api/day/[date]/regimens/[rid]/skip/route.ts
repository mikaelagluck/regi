import { z } from 'zod';
import { authed, body } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { dateParam } from '@/lib/server/dateParam';
import { setSkipped } from '@/lib/server/day';

export const POST = authed<{ date: string; rid: string }>(async ({ req, profile, params }) => {
  const { skipped } = await body(req, z.object({ skipped: z.boolean().default(true) }));
  return withDay(profile, (tx, ctx) => setSkipped(tx, ctx, dateParam(params.date), params.rid, skipped));
});
