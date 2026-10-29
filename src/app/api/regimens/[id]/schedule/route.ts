import { authed, body } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { clearSchedule, saveSchedule, scheduleConflicts, scheduleInput } from '@/lib/server/schedule';

type P = { id: string };

export const GET = authed<P>(async ({ profile, params }) => withDay(profile, async (tx, ctx) => ({ conflicts: await scheduleConflicts(tx, params.id, ctx.today) })));

export const POST = authed<P>(async ({ req, profile, params }) => {
  const input = await body(req, scheduleInput);
  await withDay(profile, (tx, ctx) => saveSchedule(tx, profile.id, params.id, input, ctx.today));
  return { ok: true };
});

export const DELETE = authed<P>(async ({ profile, params }) => {
  await withDay(profile, (tx, ctx) => clearSchedule(tx, profile.id, params.id, ctx.today));
  return { ok: true };
});
