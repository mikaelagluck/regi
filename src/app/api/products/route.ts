import { asUser } from '@/lib/db';
import { authed, body } from '@/lib/server/api';
import { filterProducts, parseFilters } from '@/lib/productFilters';
import { allProducts, createProduct, productInput } from '@/lib/server/products';

export const GET = authed(async ({ req, profile }) => {
  const filters = parseFilters(new URL(req.url).searchParams);
  const all = await asUser(profile.id, allProducts);
  return { filters, ...filterProducts(all, filters) };
});

export const POST = authed(async ({ req, profile }) => {
  const input = await body(req, productInput);
  return asUser(profile.id, (tx) => createProduct(tx, profile.id, input));
});
