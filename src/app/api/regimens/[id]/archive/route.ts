import { z } from 'zod';
import { authed, body } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { setArchived } from '@/lib/server/regimens';

export const POST = authed<{ id: string }>(async ({ req, profile, params }) => {
  const { archived } = await body(req, z.object({ archived: z.boolean().default(true) }));
  await withDay(profile, (tx, ctx) => setArchived(tx, params.id, archived, ctx.today));
  return { ok: true };
});
