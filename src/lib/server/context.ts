import 'server-only';
import { asUser, type Tx } from '@/lib/db';
import type { Profile } from '@/lib/auth/session';
import { serverNow } from './clock';
import { logicalDate } from '@/lib/logicalDate';
import { rolloverIfNeeded, type DayCtx } from './day';

/** Build the per-request day context (user timezone → logical "today"). */
export async function dayCtx(profile: Profile): Promise<DayCtx> {
  const now = await serverNow();
  return { userId: profile.id, timezone: profile.timezone, today: logicalDate(now, profile.timezone), now };
}

/** Run as the user with a fresh day context, applying lazy 4am rollover first. */
export async function withDay<T>(profile: Profile, fn: (tx: Tx, ctx: DayCtx) => Promise<T>): Promise<T> {
  const ctx = await dayCtx(profile);
  return asUser(profile.id, async (tx) => {
    await rolloverIfNeeded(tx, ctx, profile.streak_evaluated_on);
    return fn(tx, ctx);
  });
}
