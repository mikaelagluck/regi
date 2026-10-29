import { NextResponse } from 'next/server';
import { devAuthEnabled, safeNext, supabaseConfigured } from '@/lib/auth/config';
import { sign, verify } from '@/lib/auth/devToken';
import { DEV_SESSION_COOKIE, devUpsertUser } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/auth/supabase';

/** Magic-link / OAuth return. Preserves `next` (e.g. a pending "Copy to my regimens"). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get('next'));
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  if (supabaseConfigured()) {
    const code = url.searchParams.get('code');
    if (!code) return to(`/welcome?error=link&next=${encodeURIComponent(next)}`);
    const { error } = await (await supabaseServer()).auth.exchangeCodeForSession(code);
    if (error) return to(`/welcome?error=link&next=${encodeURIComponent(next)}`);
    return to(next);
  }

  if (devAuthEnabled()) {
    const payload = verify<{ email: string; kind: string }>(url.searchParams.get('dev_token'));
    if (!payload || payload.kind !== 'magic') return to(`/welcome?error=link&next=${encodeURIComponent(next)}`);
    const uid = await devUpsertUser(payload.email);
    const res = to(next);
    res.cookies.set(DEV_SESSION_COOKIE, sign({ uid, email: payload.email }, 60 * 60 * 24 * 30), {
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }
  return to('/welcome?error=config');
}
