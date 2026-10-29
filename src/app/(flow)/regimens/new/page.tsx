import { RegimenBuilder } from '@/components/regimens/RegimenBuilder';
import { requireProfile } from '@/lib/auth/session';
import { asUser } from '@/lib/db';
import type { TimeOfDay } from '@/lib/schedule';
import { pickerProducts } from '@/lib/server/builderData';
import { targetLabels } from '@/lib/server/regimens';

export const metadata = { title: 'New regimen' };

export default async function NewRegimenPage({ searchParams }: { searchParams: Promise<{ tod?: string }> }) {
  const { profile } = await requireProfile();
  const tod = (await searchParams).tod;
  const [products, labels] = await asUser(profile.id, async (tx) => [await pickerProducts(tx), await targetLabels(tx)] as const);
  const time_of_day: TimeOfDay = tod === 'evening' || tod === 'midday' ? tod : 'morning';
  return <RegimenBuilder initial={{ name: '', time_of_day, target_user_label: null, steps: [] }} products={products} targetLabels={labels} />;
}
