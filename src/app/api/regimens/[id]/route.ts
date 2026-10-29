import { authed, body } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { getRegimen, regimenInput, updateRegimen } from '@/lib/server/regimens';

type P = { id: string };

export const GET = authed<P>(async ({ profile, params }) => withDay(profile, (tx, ctx) => getRegimen(tx, params.id, ctx.today)));

export const PATCH = authed<P>(async ({ req, profile, params }) => {
  const input = await body(req, regimenInput.partial());
  return withDay(profile, async (tx, ctx) => {
    await updateRegimen(tx, params.id, input, ctx.today);
    return getRegimen(tx, params.id, ctx.today);
  });
});
