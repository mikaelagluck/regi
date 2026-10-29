export function supabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/**
 * Dev sign-in: only when Supabase isn't configured, and never on a production build unless
 * ALLOW_DEV_AUTH=1 (used by the Playwright run against `next start`).
 */
export function devAuthEnabled(): boolean {
  return !supabaseConfigured() && (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_AUTH === '1');
}

export function googleEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED !== 'false';
}

export function appleEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED === 'true';
}

/** Only allow same-site relative redirects after auth. */
export function safeNext(next: string | null | undefined, fallback = '/today'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
