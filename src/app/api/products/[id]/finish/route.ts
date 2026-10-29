import { authed, body } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { finishInput, finishProduct } from '@/lib/server/products';

/** C4.2 POST /products/:id/finish — transition to empty (B4.6). */
export const POST = authed<{ id: string }>(async ({ req, profile, params }) => {
  const input = await body(req, finishInput);
  return withDay(profile, (tx, ctx) => finishProduct(tx, params.id, ctx.today, input));
});
