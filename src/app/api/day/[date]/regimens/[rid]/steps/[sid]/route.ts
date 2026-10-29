import { authed, body } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { dateParam } from '@/lib/server/dateParam';
import { editScopeInput, editStep } from '@/lib/server/day';

/** C4.5 edit-scope: { action, scope: today | forward | specific_days, days? } (B5.6). */
export const PATCH = authed<{ date: string; rid: string; sid: string }>(async ({ req, profile, params }) => {
  const input = await body(req, editScopeInput);
  return withDay(profile, (tx, ctx) => editStep(tx, ctx, dateParam(params.date), params.rid, decodeURIComponent(params.sid), input));
});
