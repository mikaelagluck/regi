import { authed, body, notFound } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { getRegimen, removeStepFrom, stepInput, updateStepFrom } from '@/lib/server/regimens';

type P = { id: string; stepId: string };

/** Template edits apply from today; past days keep the version they ran with. */
export const PATCH = authed<P>(async ({ req, profile, params }) => {
  const input = await body(req, stepInput);
  return withDay(profile, async (tx, ctx) => {
    const r = await getRegimen(tx, params.id, ctx.today);
    const old = r.steps.find((s) => s.id === params.stepId);
    if (!old) throw notFound('Step not found');
    return { id: await updateStepFrom(tx, old, input, old.position, ctx.today) };
  });
});

export const DELETE = authed<P>(async ({ profile, params }) =>
  withDay(profile, async (tx, ctx) => {
    const r = await getRegimen(tx, params.id, ctx.today);
    const old = r.steps.find((s) => s.id === params.stepId);
    if (!old) throw notFound('Step not found');
    await removeStepFrom(tx, old, ctx.today);
    return { ok: true };
  }),
);
