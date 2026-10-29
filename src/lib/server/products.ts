import 'server-only';
import { z } from 'zod';
import type { Tx } from '@/lib/db';
import type { LogicalDate } from '@/lib/logicalDate';
import type { StepType } from '@/lib/stepTypes';
import type { Category, Product, ProductHistory, ProductState } from '@/lib/types';
import { notFound } from './api';

export { ordinal } from '@/lib/format';

const PRODUCT_SELECT = `
  select p.*, c.name as category_name, c.step_type::text as step_type,
         coalesce((
           select array_agg(distinct st.regimen_id::text)
             from regimen_steps st join regimens r on r.id = st.regimen_id
            where st.user_product_id = p.id and st.active_until is null and not r.is_archived
         ), '{}') as regimen_ids
    from user_products p join categories c on c.id = p.category_id`;

export async function listCategories(tx: Tx): Promise<Category[]> {
  return tx.q<Category>('select id, name, step_type::text as step_type, display_order from categories order by display_order');
}

export async function allProducts(tx: Tx): Promise<Product[]> {
  return tx.q<Product>(`${PRODUCT_SELECT} order by p.created_at desc`);
}

export async function getProduct(tx: Tx, id: string): Promise<Product> {
  const p = await tx.one<Product>(`${PRODUCT_SELECT} where p.id = $1`, [id]);
  if (!p) throw notFound('Product not found');
  return p;
}

export async function productHistory(tx: Tx, id: string): Promise<ProductHistory[]> {
  return tx.q<ProductHistory>('select * from user_product_history where user_product_id = $1 order by created_at desc', [id]);
}

export async function productRegimens(tx: Tx, id: string) {
  return tx.q<{ id: string; name: string; time_of_day: string }>(
    `select distinct r.id, r.name, r.time_of_day::text as time_of_day
       from regimens r join regimen_steps st on st.regimen_id = r.id
      where st.user_product_id = $1 and st.active_until is null and not r.is_archived
      order by r.name`,
    [id],
  );
}

export async function userBrands(tx: Tx): Promise<string[]> {
  const rows = await tx.q<{ brand: string }>('select distinct brand from user_products order by brand');
  return rows.map((r) => r.brand);
}

// ───────── writes ─────────

export const productInput = z.object({
  brand: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  category_id: z.string().uuid(),
  state: z.enum(['using', 'empty', 'wishlist']).default('using'),
  image_url: z.string().max(500).nullish(),
  star_rating: z.number().int().min(0).max(5).nullish(),
  notes: z.string().max(2000).nullish(),
  affiliate_url: z.string().trim().url().max(500).nullish().or(z.literal('').transform(() => null)),
  started_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish().or(z.literal('').transform(() => null)),
});
export type ProductInput = z.infer<typeof productInput>;

export async function createProduct(tx: Tx, userId: string, input: ProductInput): Promise<Product> {
  const row = await tx.one<{ id: string }>(
    `insert into user_products (user_id, brand, name, category_id, state, image_url, star_rating, notes, affiliate_url, started_on)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
    [userId, input.brand, input.name, input.category_id, input.state, input.image_url ?? null, input.star_rating ?? null, input.notes ?? null, input.affiliate_url ?? null, input.started_on ?? null],
  );
  return getProduct(tx, row!.id);
}

export async function updateProduct(tx: Tx, id: string, input: Partial<ProductInput>): Promise<Product> {
  const fields = Object.entries(input).filter(([k, v]) => v !== undefined && k !== 'state');
  if (fields.length) {
    const sets = fields.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const res = await tx.q(`update user_products set ${sets} where id = $1 returning id`, [id, ...fields.map(([, v]) => v)]);
    if (!res.length) throw notFound('Product not found');
  }
  if (input.state) await setState(tx, id, input.state);
  return getProduct(tx, id);
}

async function setState(tx: Tx, id: string, state: ProductState) {
  await tx.q(`update user_products set state = $2 where id = $1`, [id, state]);
}

export async function deleteProduct(tx: Tx, id: string) {
  const res = await tx.q('delete from user_products where id = $1 returning id', [id]);
  if (!res.length) throw notFound('Product not found');
}

export const finishInput = z.object({
  star_rating: z.number().int().min(0).max(5).nullish(),
  notes: z.string().max(2000).nullish(),
  next: z.enum(['repurchasing', 'trying_else', 'done']).nullish(),
});

/**
 * B4.6 / C4.2 finish: transition to empty, snapshot user_product_history, apply "What's next?".
 * Repurchasing → bottle count +1 and straight back to using with a fresh start date.
 */
export async function finishProduct(tx: Tx, id: string, today: LogicalDate, input: z.infer<typeof finishInput>) {
  const p = await getProduct(tx, id);
  const rating = input.star_rating ?? p.star_rating;
  await tx.q(
    `insert into user_product_history (user_product_id, started_on, finished_on, star_rating_at_completion, notes_at_completion)
     values ($1, $2, $3, $4, $5)`,
    [id, p.started_on ?? p.created_at.slice(0, 10), today, rating ?? null, input.notes ?? null],
  );
  if (input.next === 'repurchasing') {
    await tx.q(
      `update user_products set state = 'using', finished_on = null, started_on = $2, repurchase_count = repurchase_count + 1, star_rating = $3 where id = $1`,
      [id, today, rating ?? null],
    );
  } else {
    await tx.q(`update user_products set state = 'empty', finished_on = $2, star_rating = $3 where id = $1`, [id, today, rating ?? null]);
  }
  return getProduct(tx, id);
}

export async function repurchaseProduct(tx: Tx, id: string, today: LogicalDate) {
  const res = await tx.q(
    `update user_products set state = 'using', finished_on = null, started_on = $2, repurchase_count = repurchase_count + 1 where id = $1 returning id`,
    [id, today],
  );
  if (!res.length) throw notFound('Product not found');
  return getProduct(tx, id);
}

/** C2.4 started_on "auto-defaults to first regimen-instance use date if not set". */
export async function stampStartedOn(tx: Tx, productId: string | null, date: LogicalDate) {
  if (!productId) return;
  await tx.q('update user_products set started_on = $2 where id = $1 and started_on is null', [productId, date]);
}

export const STEP_FROM_PRODUCT = (p: Pick<Product, 'step_type'>): StepType => p.step_type;
