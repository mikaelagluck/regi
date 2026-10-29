import { authed, body } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { createRegimen, listRegimens, regimenInput } from '@/lib/server/regimens';

/** GET /regimens?folder=mine|shared|archived (B5.1; "Shared" = target_user_label set, conflict #8). */
export const GET = authed(async ({ req, profile }) => {
  const folder = new URL(req.url).searchParams.get('folder') ?? 'mine';
  return withDay(profile, async (tx, ctx) => {
    const list = await listRegimens(tx, ctx.today, { archived: folder === 'archived' });
    if (folder === 'shared') return list.filter((r) => r.target_user_label);
    if (folder === 'mine') return list.filter((r) => !r.target_user_label);
    return list;
  });
});

export const POST = authed(async ({ req, profile }) => {
  const input = await body(req, regimenInput);
  const id = await withDay(profile, (tx, ctx) => createRegimen(tx, profile.id, input, ctx.today));
  return { id };
});
