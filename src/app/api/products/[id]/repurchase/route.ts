import { authed } from '@/lib/server/api';
import { withDay } from '@/lib/server/context';
import { repurchaseProduct } from '@/lib/server/products';

export const POST = authed<{ id: string }>(async ({ profile, params }) => withDay(profile, (tx, ctx) => repurchaseProduct(tx, params.id, ctx.today)));
