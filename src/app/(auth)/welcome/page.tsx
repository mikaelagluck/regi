import { redirect } from 'next/navigation';
import { appleEnabled, devAuthEnabled, googleEnabled, safeNext, supabaseConfigured } from '@/lib/auth/config';
import { getProfile, getSessionUser } from '@/lib/auth/session';
import { WelcomeScreen } from './WelcomeScreen';

export const metadata = { title: 'Welcome' };

const ERRORS: Record<string, string> = {
  link: 'That sign-in link has expired or was already used. Try again.',
  google: 'Google sign-in isn’t set up yet. Continue with email instead.',
  config: 'Sign-in isn’t configured on this server yet.',
};

/** [signup-01] Welcome / Auth (B2.1 screen 1). */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const user = await getSessionUser();
  if (user) {
    // A session whose user no longer exists (e.g. deleted account) is treated as signed out.
    const profile = await getProfile(user.id);
    if (profile) redirect(profile.username ? next : `/welcome/username?next=${encodeURIComponent(next)}`);
  }
  return (
    <WelcomeScreen
      next={next}
      error={sp.error ? ERRORS[sp.error] : undefined}
      google={googleEnabled() && (supabaseConfigured() || devAuthEnabled())}
      googleLive={supabaseConfigured()}
      apple={appleEnabled() && supabaseConfigured()}
      devMode={devAuthEnabled()}
    />
  );
}
