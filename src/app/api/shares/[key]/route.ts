import { asUser } from '@/lib/db';
import { authed, body } from '@/lib/server/api';
import { getShare, shareUpdateInput, shareUrl, updateShare } from '@/lib/server/shares';

type P = { key: string };

export const GET = authed<P>(async ({ profile, params }) => {
  const s = await asUser(profile.id, (tx) => getShare(tx, params.key));
  return { ...s, url: shareUrl(s.share_slug, s.entity_type) };
});

/** Edit description or revoke (B8.2 drilldown). */
export const PATCH = authed<P>(async ({ req, profile, params }) => {
  const input = await body(req, shareUpdateInput);
  return asUser(profile.id, (tx) => updateShare(tx, params.key, input));
});
