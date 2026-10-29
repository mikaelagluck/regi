import { cookies } from 'next/headers';
import { z } from 'zod';
import { supabaseConfigured } from '@/lib/auth/config';
import { DEV_SESSION_COOKIE } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/auth/supabase';
import { asService, asUser } from '@/lib/db';
import { isValidTimeZone } from '@/lib/logicalDate';
import { authed, body } from '@/lib/server/api';

export const GET = authed(async ({ profile }) => {
  const products = await asUser(profile.id, (tx) => tx.one<{ n: number }>(`select count(*)::int as n from user_products where state <> 'wishlist'`));
  return { ...profile, product_count: products?.n ?? 0 };
});

const patch = z.object({
  display_name: z.string().trim().max(60).nullish(),
  avatar_url: z.string().max(500).nullish(),
  timezone: z.string().refine(isValidTimeZone, 'Unknown timezone').optional(),
  notify_regimen_reminders: z.boolean().optional(),
  notify_timer_alerts: z.boolean().optional(),
  notify_share_activity: z.boolean().optional(),
});

export const PATCH = authed(async ({ req, profile }) => {
  const input = await body(req, patch);
  const entries = Object.entries(input).filter(([, v]) => v !== undefined);
  if (entries.length) {
    await asUser(profile.id, (tx) =>
      tx.q(`update users set ${entries.map(([k], i) => `${k} = $${i + 2}`).join(', ')} where id = $1`, [profile.id, ...entries.map(([, v]) => v)]),
    );
  }
  return { ok: true };
});

/** Account deletion (CLAUDE.md conflict #9): delete all data, then the auth user. */
export const DELETE = authed(async ({ req, profile }) => {
  const { confirm } = await body(req, z.object({ confirm: z.literal(profile.username ?? '') }));
  void confirm;
  // public.users cascades to every user-owned table; auth.users cascades to public.users.
  if (supabaseConfigured()) {
    await asService((tx) => tx.q('delete from public.users where id = $1', [profile.id]));
    const { error } = await supabaseAdmin().auth.admin.deleteUser(profile.id);
    if (error) throw new Error(error.message);
  } else {
    await asService((tx) => tx.q('delete from auth.users where id = $1', [profile.id]));
  }
  (await cookies()).delete(DEV_SESSION_COOKIE);
  return { ok: true };
});
