import { ProductForm } from '@/components/products/ProductForm';
import { requireProfile } from '@/lib/auth/session';
import { asUser } from '@/lib/db';
import { listCategories, userBrands } from '@/lib/server/products';
import type { ProductState } from '@/lib/types';

export const metadata = { title: 'Add product' };

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ state?: string; returnTo?: string }> }) {
  const { profile } = await requireProfile();
  const sp = await searchParams;
  const [categories, brands] = await asUser(profile.id, async (tx) => [await listCategories(tx), await userBrands(tx)] as const);
  const state = (['using', 'empty', 'wishlist'].includes(sp.state ?? '') ? sp.state : 'using') as ProductState;
  const returnTo = sp.returnTo?.startsWith('/') && !sp.returnTo.startsWith('//') ? sp.returnTo : undefined;
  return <ProductForm categories={categories} brands={brands} initialState={state} returnTo={returnTo} />;
}
