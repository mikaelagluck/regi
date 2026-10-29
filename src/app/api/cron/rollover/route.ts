import { NextResponse } from 'next/server';
import { asService, asUser } from '@/lib/db';
import { logicalDate } from '@/lib/logicalDate';
import { cronAuthorized, unauthorized } from '@/lib/server/cron';
import { recomputeStreak } from '@/lib/server/day';

export const dynamic = 'force-dynamic';

/**
 * 4am rollover job (C3.3), run hourly. Each user whose logical day has advanced since their last
 * evaluation gets their streak recomputed — an imperfect previous day resets it to 0.
 */
async function run(req: Request) {
  if (!cronAuthorized(req)) return unauthorized();
  const now = new Date();
  const users = await asService((tx) => tx.q<{ id: string; timezone: string; streak_evaluated_on: string | null }>('select id, timezone, streak_evaluated_on from users where username is not null'));
  let evaluated = 0;
  for (const u of users) {
    const today = logicalDate(now, u.timezone);
    if (u.streak_evaluated_on === today) continue;
    await asUser(u.id, (tx) => recomputeStreak(tx, { userId: u.id, today }));
    evaluated += 1;
  }
  return NextResponse.json({ ok: true, users: users.length, evaluated });
}

export const GET = run;
export const POST = run;
