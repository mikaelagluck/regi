import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { asAnon } from '@/lib/db';
import { trackView } from '@/lib/server/shares';

const COOKIE = 'regi_vk';

/** C4.6 track-view — deduped per anonymous viewer per day (works for /r and /p shares). */
export async function POST(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const store = await cookies();
  let key = store.get(COOKIE)?.value;
  if (!key || !/^[a-f0-9-]{36}$/.test(key)) {
    key = crypto.randomUUID();
    store.set(COOKIE, key, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' });
  }
  await asAnon((tx) => trackView(tx, slug, key!)).catch(() => null);
  return NextResponse.json({ ok: true });
}
