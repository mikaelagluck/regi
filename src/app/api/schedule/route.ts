import { isLogicalDate, logicalDateRange } from '@/lib/logicalDate';
import { resolveRange } from '@/lib/schedule';
import { authed, badRequest } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { userAssignments } from '@/lib/server/regimens';

/** C4.4 GET /schedule?from&to — resolved regimen per slot per day. */
export const GET = authed(async ({ req, profile }) => {
  const q = new URL(req.url).searchParams;
  const from = q.get('from');
  const to = q.get('to');
  if (!isLogicalDate(from) || !isLogicalDate(to) || logicalDateRange(from, to).length > 62) throw badRequest('from/to must be dates at most 62 days apart');
  return withDay(profile, async (tx) => {
    const resolved = resolveRange(await userAssignments(tx), from, to);
    return Object.fromEntries(Object.entries(resolved).map(([d, slots]) => [d, Object.fromEntries(Object.entries(slots).map(([slot, a]) => [slot, a!.regimen_id]))]));
  });
});
