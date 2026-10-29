import { RegimenBuilder } from '@/components/regimens/RegimenBuilder';
import { requireProfile } from '@/lib/auth/session';
import { pickerProducts } from '@/lib/server/builderData';
import { withDay } from '@/lib/server/context';
import { orNotFound } from '@/lib/server/pages';
import { getRegimen, targetLabels } from '@/lib/server/regimens';

export const metadata = { title: 'Edit steps' };

export default async function EditRegimenPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireProfile();
  const { id } = await params;
  const { r, products, labels } = await orNotFound(
    withDay(profile, async (tx, ctx) => ({ r: await getRegimen(tx, id, ctx.today), products: await pickerProducts(tx), labels: await targetLabels(tx) })),
  );
  return (
    <RegimenBuilder
      initial={{
        id: r.id,
        name: r.name,
        time_of_day: r.time_of_day,
        target_user_label: r.target_user_label,
        steps: r.steps.map((st) => ({ key: st.id, id: st.id, step_type: st.step_type, user_product_id: st.user_product_id, free_text_label: st.free_text_label, wait_seconds_after: st.wait_seconds_after, notes: st.notes })),
      }}
      products={products}
      targetLabels={labels}
    />
  );
}
