import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { asAnon, asUser } from '@/lib/db';
import { isValidTimeZone } from '@/lib/logicalDate';
import { body, errorResponse } from '@/lib/server/api';

/** GET ?u=name — real-time availability (B2.1). */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get('u') ?? '';
  const row = await asAnon((tx) => tx.one<{ ok: boolean }>('select username_available($1) as ok', [u]));
  return NextResponse.json({ available: !!row?.ok, valid: /^[a-z0-9_]{3,20}$/.test(u.toLowerCase()) });
}

const input = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, '3–20 letters, numbers or underscores'),
  display_name: z.string().trim().max(60).nullish(),
  timezone: z.string().refine(isValidTimeZone).optional(),
});

/** POST — claim the username once ([signup-02]). */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    const { username, display_name, timezone } = await body(req, input);
    await asUser(user.id, async (tx) => {
      await tx.q('select claim_username($1, $2)', [username, display_name ?? null]);
      if (timezone) await tx.q('update users set timezone = $2 where id = $1', [user.id, timezone]);
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message ?? '';
    if (/taken/.test(msg)) return NextResponse.json({ error: 'That username is taken' }, { status: 409 });
    if (/already set/.test(msg)) return NextResponse.json({ error: 'Username already set' }, { status: 409 });
    return errorResponse(e);
  }
}
