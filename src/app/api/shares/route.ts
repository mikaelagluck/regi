import { asUser } from '@/lib/db';
import { authed, body } from '@/lib/server/api';
import { createShare, listShares, shareCreateInput, shareUrl } from '@/lib/server/shares';

export const GET = authed(async ({ profile }) => asUser(profile.id, listShares));

export const POST = authed(async ({ req, profile }) => {
  const input = await body(req, shareCreateInput);
  const share = await asUser(profile.id, (tx) => createShare(tx, profile.id, input));
  return { ...share, url: shareUrl(share.share_slug, share.entity_type) };
});
