import { ShareDetail } from '@/components/profile/ShareDetail';
import { requireProfile } from '@/lib/auth/session';
import { asUser } from '@/lib/db';
import { orNotFound } from '@/lib/server/pages';
import { getShare, shareUrl } from '@/lib/server/shares';

export const metadata = { title: 'Share' };

/** B8.2 drilldown: copy link, edit description, revoke. */
export default async function ShareDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireProfile();
  const { id } = await params;
  const share = await orNotFound(asUser(profile.id, (tx) => getShare(tx, id)));
  return <ShareDetail share={share} url={shareUrl(share.share_slug, share.entity_type)} />;
}
