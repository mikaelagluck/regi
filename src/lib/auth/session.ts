import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { asService, asUser } from '@/lib/db';
import { devAuthEnabled, supabaseConfigured } from './config';
import { verify } from './devToken';
import { supabaseServer } from './supabase';

export const DEV_SESSION_COOKIE = 'regi_dev_session';

export interface SessionUser {
  id: string;
  email: string | null;
}

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  current_streak_days: number;
  longest_streak_days: number;
  lifetime_regimens_completed: number;
  streak_evaluated_on: string | null;
  notify_regimen_reminders: boolean;
  notify_timer_alerts: boolean;
  notify_share_activity: boolean;
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Always read cookies first so every signed-in page renders per request (never prerendered).
  const store = await cookies();
  if (supabaseConfigured()) {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  }
  if (devAuthEnabled()) {
    const payload = verify<{ uid: string; email: string }>(store.get(DEV_SESSION_COOKIE)?.value);
    return payload ? { id: payload.uid, email: payload.email } : null;
  }
  return null;
});

export const getProfile = cache(async (userId: string): Promise<Profile | null> => {
  const row = await asUser(userId, (tx) => tx.one<Profile>('select * from users where id = $1', [userId]));
  if (row) return row;
  // Profile rows are created by the auth.users trigger; recover if it was missed.
  await asService((tx) => tx.q('insert into public.users (id) select id from auth.users where id = $1 on conflict do nothing', [userId]));
  return asUser(userId, (tx) => tx.one<Profile>('select * from users where id = $1', [userId]));
});

/** For signed-in app pages: redirects to the welcome or username screen as needed. */
export async function requireProfile(next?: string): Promise<{ user: SessionUser; profile: Profile & { username: string } }> {
  const user = await getSessionUser();
  if (!user) redirect(next ? `/welcome?next=${encodeURIComponent(next)}` : '/welcome');
  const profile = await getProfile(user.id);
  if (!profile) redirect('/welcome');
  if (!profile.username) redirect(next ? `/welcome/username?next=${encodeURIComponent(next)}` : '/welcome/username');
  return { user, profile: profile as Profile & { username: string } };
}

/** Upsert an auth user by email (dev mode only) and return its id. */
export async function devUpsertUser(email: string): Promise<string> {
  const row = await asService((tx) =>
    tx.one<{ id: string }>(
      `insert into auth.users (email) values (lower($1))
       on conflict (email) do update set email = excluded.email returning id`,
      [email],
    ),
  );
  return row!.id;
}
