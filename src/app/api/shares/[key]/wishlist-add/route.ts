import { z } from 'zod';
import { asUser } from '@/lib/db';
import { authed, body } from '@/lib/server/api';
import { wishlistFromShare } from '@/lib/server/shares';

/** C4.6 POST /shares/:slug/wishlist-add (B7.5). */
export const POST = authed<{ key: string }>(async ({ req, profile, params }) => {
  const { step_id } = await body(req, z.object({ step_id: z.string().uuid() }));
  return { id: await asUser(profile.id, (tx) => wishlistFromShare(tx, params.key, step_id)) };
});
