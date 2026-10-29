import { NextResponse } from 'next/server';
import { safeNext, supabaseConfigured } from '@/lib/auth/config';
import { supabaseServer } from '@/lib/auth/supabase';

/** "Continue with Google" → Supabase OAuth (PKCE verifier kept in cookies by @supabase/ssr). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get('next'));
  if (!supabaseConfigured()) return NextResponse.redirect(new URL(`/welcome?error=google&next=${encodeURIComponent(next)}`, url.origin));
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const provider = url.searchParams.get('provider') === 'apple' ? 'apple' : 'google';
  const { data, error } = await (await supabaseServer()).auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) return NextResponse.redirect(new URL(`/welcome?error=google&next=${encodeURIComponent(next)}`, url.origin));
  return NextResponse.redirect(data.url);
}
