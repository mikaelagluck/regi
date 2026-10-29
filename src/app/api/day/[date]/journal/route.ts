import { z } from 'zod';
import { authed, body } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { dateParam } from '@/lib/server/dateParam';
import { setJournal } from '@/lib/server/day';

/** B3.9 — saved per regimen_instance. */
export const PATCH = authed<{ date: string }>(async ({ req, profile, params }) => {
  const { regimen_id, note } = await body(req, z.object({ regimen_id: z.string().uuid(), note: z.string().max(4000).nullable() }));
  return withDay(profile, (tx, ctx) => setJournal(tx, ctx, dateParam(params.date), regimen_id, note));
});
