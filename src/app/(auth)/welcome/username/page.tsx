import { redirect } from 'next/navigation';
import { safeNext } from '@/lib/auth/config';
import { getProfile, getSessionUser } from '@/lib/auth/session';
import { UsernameForm } from './UsernameForm';

export const metadata = { title: 'Pick a username' };

/** [signup-02] Pick username (B2.1 screen 2). */
export default async function UsernamePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const user = await getSessionUser();
  if (!user) redirect(`/welcome?next=${encodeURIComponent(next)}`);
  const profile = await getProfile(user.id);
  if (!profile) redirect(`/welcome?next=${encodeURIComponent(next)}`);
  if (profile.username) redirect(next);
  return <UsernameForm next={next} initialDisplayName={profile.display_name ?? ''} />;
}
