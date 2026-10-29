import { authed } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { loadDay } from '@/lib/server/day';

/** C4.5 GET /today — resolved regimens for the current logical date with full step state. */
export const GET = authed(async ({ profile }) => withDay(profile, (tx, ctx) => loadDay(tx, ctx, ctx.today)));
