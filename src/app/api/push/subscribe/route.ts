import { z } from 'zod';
import { asUser } from '@/lib/db';
import { authed, body } from '@/lib/server/api';

const sub = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

export const POST = authed(async ({ req, profile }) => {
  const s = await body(req, sub);
  await asUser(profile.id, (tx) =>
    tx.q(
      `insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, $2, $3, $4)
       on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth`,
      [profile.id, s.endpoint, s.keys.p256dh, s.keys.auth],
    ),
  );
  return { ok: true };
});

export const DELETE = authed(async ({ req, profile }) => {
  const { endpoint } = await body(req, z.object({ endpoint: z.string().url() }));
  await asUser(profile.id, (tx) => tx.q('delete from push_subscriptions where endpoint = $1', [endpoint]));
  return { ok: true };
});
