import { z } from 'zod';
import { asUser } from '@/lib/db';
import { authed, body } from '@/lib/server/api';
import { wishlistFromProductShare, wishlistFromShare } from '@/lib/server/shares';

/** C4.6 POST /shares/:slug/wishlist-add (B7.5). `step_id` for a regimen share; omit it for a product share. */
export const POST = authed<{ key: string }>(async ({ req, profile, params }) => {
  const { step_id } = await body(req, z.object({ step_id: z.string().uuid().optional() }));
  const id = await asUser(profile.id, (tx) => (step_id ? wishlistFromShare(tx, params.key, step_id) : wishlistFromProductShare(tx, params.key)));
  return { id };
});
