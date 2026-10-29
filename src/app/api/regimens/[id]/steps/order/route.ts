import { z } from 'zod';
import { authed, body } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { reorderSteps } from '@/lib/server/regimens';

export const PUT = authed<{ id: string }>(async ({ req, profile, params }) => {
  const { order } = await body(req, z.object({ order: z.array(z.string().uuid()).max(50) }));
  await withDay(profile, (tx, ctx) => reorderSteps(tx, params.id, order, ctx.today));
  return { ok: true };
});
