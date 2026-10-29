import { ProductForm } from '@/components/products/ProductForm';
import { requireProfile } from '@/lib/auth/session';
import { asUser } from '@/lib/db';
import { orNotFound } from '@/lib/server/pages';
import { getProduct, listCategories, userBrands } from '@/lib/server/products';

export const metadata = { title: 'Edit product' };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireProfile();
  const { id } = await params;
  const [product, categories, brands] = await orNotFound(asUser(profile.id, async (tx) => [await getProduct(tx, id), await listCategories(tx), await userBrands(tx)] as const));
  return <ProductForm categories={categories} brands={brands} product={product} />;
}
