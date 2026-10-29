import { ProductsScreen } from '@/components/products/ProductsScreen';
import { requireProfile } from '@/lib/auth/session';
import { asUser } from '@/lib/db';
import { parseFilters } from '@/lib/productFilters';
import { allProducts, listCategories } from '@/lib/server/products';

export const metadata = { title: 'Products' };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { profile } = await requireProfile();
  const filters = parseFilters(await searchParams);
  const [products, categories, regimens] = await asUser(profile.id, async (tx) => [
    await allProducts(tx),
    await listCategories(tx),
    await tx.q<{ id: string; name: string }>('select id, name from regimens where not is_archived order by name'),
  ] as const);
  return <ProductsScreen products={products} categories={categories} regimens={regimens} filters={filters} />;
}
