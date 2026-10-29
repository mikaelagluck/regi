import { asUser } from '@/lib/db';
import { authed, body } from '@/lib/server/api';
import { deleteProduct, getProduct, productHistory, productInput, productRegimens, updateProduct } from '@/lib/server/products';

type P = { id: string };

export const GET = authed<P>(async ({ profile, params }) =>
  asUser(profile.id, async (tx) => ({
    ...(await getProduct(tx, params.id)),
    regimens: await productRegimens(tx, params.id),
    history: await productHistory(tx, params.id),
  })),
);

export const PATCH = authed<P>(async ({ req, profile, params }) => {
  const input = await body(req, productInput.partial());
  return asUser(profile.id, (tx) => updateProduct(tx, params.id, input));
});

export const DELETE = authed<P>(async ({ profile, params }) => {
  await asUser(profile.id, (tx) => deleteProduct(tx, params.id));
  return { ok: true };
});
