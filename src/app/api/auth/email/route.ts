import { NextResponse } from 'next/server';
import { z } from 'zod';
import { devAuthEnabled, safeNext, supabaseConfigured } from '@/lib/auth/config';
import { sign } from '@/lib/auth/devToken';
import { supabaseServer } from '@/lib/auth/supabase';
import { body, errorResponse } from '@/lib/server/api';

const input = z.object({ email: z.string().trim().email().max(200), next: z.string().optional() });

/** "Continue with email": send a Supabase magic link (dev: return a signed link to show on screen). */
export async function POST(req: Request) {
  try {
    const { email, next } = await body(req, input);
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
    const callback = `${origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;
    if (supabaseConfigured()) {
      const supabase = await supabaseServer();
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callback, shouldCreateUser: true } });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ sent: true });
    }
    if (devAuthEnabled()) {
      const token = sign({ email: email.toLowerCase(), kind: 'magic' }, 15 * 60);
      return NextResponse.json({ sent: true, devLink: `/auth/callback?dev_token=${token}&next=${encodeURIComponent(safeNext(next))}` });
    }
    return NextResponse.json({ error: 'Sign-in is not configured' }, { status: 503 });
  } catch (e) {
    return errorResponse(e);
  }
}
