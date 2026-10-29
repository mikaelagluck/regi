import 'server-only';
import crypto from 'node:crypto';
import { z } from 'zod';
import type { Tx } from '@/lib/db';
import type { PublicShare, Share } from '@/lib/types';
import { notFound } from './api';

const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newSlug(len = 10): string {
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export const shareCreateInput = z.object({
  entity_type: z.enum(['regimen', 'user_product']),
  entity_id: z.string().uuid(),
  description: z.string().trim().max(500).nullish(),
});

const SHARE_SELECT = `
  select s.id, s.share_slug, s.entity_type::text as entity_type, s.entity_id, s.description, s.is_active,
         s.view_count, s.copy_count, s.link_click_count, s.created_at, s.revoked_at,
         coalesce(r.name, p.brand || ' ' || p.name, 'Deleted') as entity_name
    from share_artifacts s
    left join regimens r on s.entity_type = 'regimen' and r.id = s.entity_id
    left join user_products p on s.entity_type = 'user_product' and p.id = s.entity_id`;

export async function createShare(tx: Tx, userId: string, input: z.infer<typeof shareCreateInput>): Promise<Share> {
  const row = await tx.one<{ id: string }>(
    `insert into share_artifacts (share_slug, creator_user_id, entity_type, entity_id, description) values ($1, $2, $3, $4, $5) returning id`,
    [newSlug(), userId, input.entity_type, input.entity_id, input.description || null],
  );
  return getShare(tx, row!.id);
}

export async function listShares(tx: Tx): Promise<Share[]> {
  return tx.q<Share>(`${SHARE_SELECT} order by s.created_at desc`);
}

export async function getShare(tx: Tx, id: string): Promise<Share> {
  const s = await tx.one<Share>(`${SHARE_SELECT} where s.id = $1`, [id]);
  if (!s) throw notFound('Share not found');
  return s;
}

export const shareUpdateInput = z.object({
  description: z.string().trim().max(500).nullish(),
  revoke: z.boolean().optional(),
});

export async function updateShare(tx: Tx, id: string, input: z.infer<typeof shareUpdateInput>) {
  if (input.description !== undefined) await tx.q('update share_artifacts set description = $2 where id = $1', [id, input.description || null]);
  if (input.revoke) await tx.q('update share_artifacts set is_active = false, revoked_at = now() where id = $1 and is_active', [id]);
  return getShare(tx, id);
}

export async function publicShare(tx: Tx, slug: string): Promise<PublicShare | null> {
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(slug)) return null;
  const row = await tx.one<{ s: PublicShare | null }>('select public_share($1) as s', [slug]);
  return row?.s ?? null;
}

export async function trackView(tx: Tx, slug: string, viewerKey: string) {
  await tx.q('select track_share_view($1, $2)', [slug, viewerKey]);
}

export async function trackLinkClick(tx: Tx, slug: string) {
  await tx.q('select track_share_link_click($1)', [slug]);
}

export async function copyShared(tx: Tx, slug: string): Promise<string> {
  const row = await tx.one<{ id: string }>('select copy_shared_regimen($1) as id', [slug]);
  return row!.id;
}

export async function wishlistFromShare(tx: Tx, slug: string, stepId: string): Promise<string> {
  const row = await tx.one<{ id: string }>('select wishlist_from_share($1, $2) as id', [slug, stepId]);
  return row!.id;
}

export function shareUrl(slug: string, type: Share['entity_type']) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return `${base}/${type === 'user_product' ? 'p' : 'r'}/${slug}`;
}

export async function wishlistFromProductShare(tx: Tx, slug: string): Promise<string> {
  const row = await tx.one<{ id: string }>('select wishlist_from_product_share($1) as id', [slug]);
  return row!.id;
}
