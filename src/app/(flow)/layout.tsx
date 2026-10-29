import { requireProfile } from '@/lib/auth/session';

/** Full-screen modal routes: creation flows cover the bottom nav (B1.3). */
export default async function FlowLayout({ children }: { children: React.ReactNode }) {
  await requireProfile();
  return <main id="main">{children}</main>;
}
