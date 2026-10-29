import { MySharesScreen } from '@/components/profile/MySharesScreen';
import { requireProfile } from '@/lib/auth/session';
import { asUser } from '@/lib/db';
import { listShares } from '@/lib/server/shares';

export const metadata = { title: 'My Shares' };

/** [my-shares] B8.2 */
export default async function MySharesPage() {
  const { profile } = await requireProfile();
  const shares = await asUser(profile.id, listShares);
  return <MySharesScreen shares={shares} />;
}
