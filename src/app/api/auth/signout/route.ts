import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseConfigured } from '@/lib/auth/config';
import { DEV_SESSION_COOKIE } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/auth/supabase';

export async function POST() {
  if (supabaseConfigured()) await (await supabaseServer()).auth.signOut();
  (await cookies()).delete(DEV_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
