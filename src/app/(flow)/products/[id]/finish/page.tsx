import { FinishForm } from '@/components/products/FinishForm';
import { requireProfile } from '@/lib/auth/session';
import { asUser } from '@/lib/db';
import { daysBetween, formatMonthDay } from '@/lib/logicalDate';
import { dayCtx } from '@/lib/server/context';
import { orNotFound } from '@/lib/server/pages';
import { getProduct } from '@/lib/server/products';

export const metadata = { title: 'Finished it!' };

/** [empty-product-modal] B4.6 */
export default async function FinishPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireProfile();
  const { id } = await params;
  const ctx = await dayCtx(profile);
  const p = await orNotFound(asUser(profile.id, (tx) => getProduct(tx, id)));
  const start = p.started_on ?? p.created_at.slice(0, 10);
  const used = `Used ${formatMonthDay(start)} — ${formatMonthDay(ctx.today)} · ${Math.max(1, daysBetween(start, ctx.today))} days`;
  return <FinishForm product={p} usedLine={used} />;
}
