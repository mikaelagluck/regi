import { authed, body } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { addStep, stepInput } from '@/lib/server/regimens';

export const POST = authed<{ id: string }>(async ({ req, profile, params }) => {
  const input = await body(req, stepInput);
  return { id: await withDay(profile, (tx, ctx) => addStep(tx, params.id, input, ctx.today)) };
});
