import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { openPglite, pgliteDb } from '@/lib/db/pglite';
import type { Db } from '@/lib/db/types';

// Applies the real supabase/migrations to an in-memory Postgres and checks C6.1 policies.

let pg: PGlite;
let db: Db;
const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';

beforeAll(async () => {
  pg = await openPglite();
  db = pgliteDb(pg);
  await db.asService(async (tx) => {
    await tx.q(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 'a@x.test', '{"full_name":"Alice A"}'), ($2, 'b@x.test', '{}')`, [A, B]);
  });
});

async function catId(step: string) {
  return (await db.asAnon((tx) => tx.one<{ id: string }>(`select id from categories where step_type = $1 order by display_order limit 1`, [step])))!.id;
}

describe('migrations', () => {
  it('signup trigger creates a profile row with display name from metadata', async () => {
    const row = await db.asUser(A, (tx) => tx.one<{ display_name: string; username: string | null }>('select display_name, username from users'));
    expect(row).toEqual({ display_name: 'Alice A', username: null });
  });

  it('seeds categories for all 9 step types', async () => {
    const rows = await db.asAnon((tx) => tx.q<{ step_type: string }>('select distinct step_type::text as step_type from categories'));
    expect(rows.map((r) => r.step_type).sort()).toEqual(
      ['apply', 'cleanse', 'mask', 'massage', 'mist', 'moisturize', 'protect', 'tool', 'treat'],
    );
  });
});

describe('usernames', () => {
  it('claims once, reports availability, rejects duplicates', async () => {
    expect(await db.asAnon((tx) => tx.one<{ ok: boolean }>(`select username_available('alice') as ok`))).toEqual({ ok: true });
    await db.asUser(A, (tx) => tx.q(`select claim_username('Alice', 'Alice')`));
    expect(await db.asAnon((tx) => tx.one<{ ok: boolean }>(`select username_available('alice') as ok`))).toEqual({ ok: false });
    await expect(db.asUser(B, (tx) => tx.q(`select claim_username('alice', null)`))).rejects.toThrow(/taken/);
    await expect(db.asUser(A, (tx) => tx.q(`select claim_username('alice2', null)`))).rejects.toThrow(/already set/);
    await db.asUser(B, (tx) => tx.q(`select claim_username('bea', null)`));
  });

  it('users cannot write their own counters', async () => {
    await expect(db.asUser(A, (tx) => tx.q('update users set current_streak_days = 999'))).rejects.toThrow(/permission denied/);
    await db.asUser(A, (tx) => tx.q(`update users set timezone = 'America/New_York'`));
  });
});

describe('row-level security', () => {
  let productA: string;
  let regimenA: string;

  beforeAll(async () => {
    const cat = await catId('treat');
    productA = (await db.asUser(A, (tx) => tx.one<{ id: string }>(
      `insert into user_products (user_id, brand, name, category_id, notes, affiliate_url) values ($1, 'SkinCeuticals', 'CE Ferulic', $2, 'private note', 'https://shop.test/ce') returning id`, [A, cat])))!.id;
    regimenA = (await db.asUser(A, (tx) => tx.one<{ id: string }>(
      `insert into regimens (owner_user_id, name, time_of_day) values ($1, 'Daily Morning', 'morning') returning id`, [A])))!.id;
    await db.asUser(A, (tx) => tx.q(
      `insert into regimen_steps (regimen_id, position, user_product_id, free_text_label, step_type, wait_seconds_after, notes) values ($1, 0, $2, null, 'treat', 300, '3 drops'), ($1, 1, null, 'Any SPF', 'protect', 0, null)`, [regimenA, productA]));
    await db.asUser(A, (tx) => tx.q(`insert into regimen_instances (regimen_id, user_id, date, journal_note) values ($1, $2, '2026-05-07', 'secret journal')`, [regimenA, A]));
  });

  it("hides other users' rows on every table", async () => {
    for (const table of ['users', 'user_products', 'regimens', 'regimen_steps', 'regimen_instances', 'schedule_assignments']) {
      const rows = await db.asUser(B, (tx) => tx.q(`select * from ${table}`));
      expect(rows.every((r) => !Object.values(r).includes(A)), table).toBe(true);
    }
    expect(await db.asUser(B, (tx) => tx.q('select * from user_products'))).toHaveLength(0);
    expect(await db.asUser(B, (tx) => tx.q('select * from regimen_steps'))).toHaveLength(0);
  });

  it('blocks inserting rows owned by someone else', async () => {
    const cat = await catId('treat');
    await expect(db.asUser(B, (tx) => tx.q(`insert into user_products (user_id, brand, name, category_id) values ($1, 'x', 'y', $2)`, [A, cat]))).rejects.toThrow(/row-level security/);
    await expect(db.asUser(B, (tx) => tx.q(`insert into regimen_steps (regimen_id, position, free_text_label, step_type) values ($1, 9, 'x', 'treat')`, [regimenA]))).rejects.toThrow(/row-level security/);
  });

  it('signed-out visitors see only categories', async () => {
    expect((await db.asAnon((tx) => tx.q('select * from categories'))).length).toBeGreaterThan(9);
    await expect(db.asAnon((tx) => tx.q('select * from user_products'))).rejects.toThrow(/permission denied/);
    await expect(db.asAnon((tx) => tx.q('select * from share_artifacts'))).rejects.toThrow(/permission denied/);
  });

  describe('sharing functions', () => {
    let stepProduct: string;
    beforeAll(async () => {
      await db.asUser(A, (tx) => tx.q(`insert into share_artifacts (share_slug, creator_user_id, entity_type, entity_id, description) values ('abc123xyz', $1, 'regimen', $2, 'My AM')`, [A, regimenA]));
      stepProduct = (await db.asUser(A, (tx) => tx.one<{ id: string }>(`select id from regimen_steps where position = 0`)))!.id;
    });

    it('public_share returns steps without journal or product notes', async () => {
      const s = (await db.asAnon((tx) => tx.one<{ s: Record<string, unknown> }>(`select public_share('abc123xyz') as s`)))!.s;
      expect(s).toMatchObject({ description: 'My AM', creator: { username: 'alice' }, regimen: { name: 'Daily Morning' } });
      const json = JSON.stringify(s);
      expect(json).not.toContain('secret journal');
      expect(json).not.toContain('private note');
      expect((s.steps as unknown[]).length).toBe(2);
    });

    it('shares are not enumerable and other users cannot read the table', async () => {
      expect(await db.asUser(B, (tx) => tx.q('select * from share_artifacts'))).toHaveLength(0);
      expect(await db.asAnon((tx) => tx.one<{ s: unknown }>(`select public_share('nope00') as s`))).toEqual({ s: null });
    });

    it('view tracking dedupes per viewer per day', async () => {
      await db.asAnon((tx) => tx.q(`select track_share_view('abc123xyz', 'viewer-1')`));
      await db.asAnon((tx) => tx.q(`select track_share_view('abc123xyz', 'viewer-1')`));
      await db.asAnon((tx) => tx.q(`select track_share_view('abc123xyz', 'viewer-2')`));
      const row = await db.asUser(A, (tx) => tx.one<{ view_count: number }>(`select view_count from share_artifacts`));
      expect(row!.view_count).toBe(2);
    });

    it('copy creates free-text steps for the recipient and counts the copy (B7.4)', async () => {
      const id = (await db.asUser(B, (tx) => tx.one<{ id: string }>(`select copy_shared_regimen('abc123xyz') as id`)))!.id;
      const steps = await db.asUser(B, (tx) => tx.q<{ free_text_label: string; user_product_id: string | null; wait_seconds_after: number; notes: string | null; reference_url: string | null }>(
        `select free_text_label, user_product_id, wait_seconds_after, notes, reference_url from regimen_steps where regimen_id = $1 order by position`, [id]));
      expect(steps).toEqual([
        { free_text_label: 'SkinCeuticals CE Ferulic', user_product_id: null, wait_seconds_after: 300, notes: '3 drops', reference_url: 'https://shop.test/ce' },
        { free_text_label: 'Any SPF', user_product_id: null, wait_seconds_after: 0, notes: null, reference_url: null },
      ]);
      const reg = await db.asUser(B, (tx) => tx.one<{ cloned_from_regimen_id: string }>(`select cloned_from_regimen_id from regimens where id = $1`, [id]));
      expect(reg!.cloned_from_regimen_id).toBe(regimenA);
      expect((await db.asUser(A, (tx) => tx.one<{ copy_count: number }>(`select copy_count from share_artifacts`)))!.copy_count).toBe(1);
      // creator gets a share-activity notification queued
      expect(await db.asUser(A, (tx) => tx.q(`select * from scheduled_notifications where kind = 'share_activity'`))).toHaveLength(1);
    });

    it('wishlist-add copies brand, name, category and affiliate URL (B7.5)', async () => {
      const id = (await db.asUser(B, (tx) => tx.one<{ id: string }>(`select wishlist_from_share('abc123xyz', $1) as id`, [stepProduct])))!.id;
      const p = await db.asUser(B, (tx) => tx.one(`select brand, name, state::text as state, affiliate_url, notes from user_products where id = $1`, [id]));
      expect(p).toEqual({ brand: 'SkinCeuticals', name: 'CE Ferulic', state: 'wishlist', affiliate_url: 'https://shop.test/ce', notes: null });
    });

    it('revoked shares disappear publicly', async () => {
      await db.asUser(A, (tx) => tx.q(`update share_artifacts set is_active = false, revoked_at = now()`));
      expect(await db.asAnon((tx) => tx.one<{ s: unknown }>(`select public_share('abc123xyz') as s`))).toEqual({ s: null });
      await expect(db.asUser(B, (tx) => tx.q(`select copy_shared_regimen('abc123xyz')`))).rejects.toThrow(/not found/);
    });
  });
});

describe('cross-user references are rejected', () => {
  it("can't attach rows to another user's regimen or product", async () => {
    const regA = (await db.asUser(A, (tx) => tx.one<{ id: string }>(`select id from regimens limit 1`)))!.id;
    const prodA = (await db.asUser(A, (tx) => tx.one<{ id: string }>(`select id from user_products limit 1`)))!.id;
    await expect(db.asUser(B, (tx) => tx.q(`insert into regimen_instances (regimen_id, user_id, date) values ($1, $2, '2026-05-08')`, [regA, B]))).rejects.toThrow(/row-level security/);
    await expect(db.asUser(B, (tx) => tx.q(`insert into schedule_assignments (user_id, regimen_id, schedule_type, recurrence_rule, time_of_day) values ($1, $2, 'standard', 'FREQ=DAILY', 'morning')`, [B, regA]))).rejects.toThrow(/row-level security/);
    await expect(db.asUser(B, (tx) => tx.q(`insert into share_artifacts (share_slug, creator_user_id, entity_type, entity_id) values ('stolen123', $1, 'regimen', $2)`, [B, regA]))).rejects.toThrow(/row-level security/);
    const regB = (await db.asUser(B, (tx) => tx.one<{ id: string }>(`insert into regimens (owner_user_id, name, time_of_day) values ($1, 'B AM', 'morning') returning id`, [B])))!.id;
    await expect(db.asUser(B, (tx) => tx.q(`insert into regimen_steps (regimen_id, position, user_product_id, step_type) values ($1, 0, $2, 'treat')`, [regB, prodA]))).rejects.toThrow(/row-level security/);
  });
});

describe('product shares', () => {
  it('wishlist_from_product_share copies the product to the caller and counts it', async () => {
    const prodA = (await db.asUser(A, (tx) => tx.one<{ id: string }>(`select id from user_products where brand = 'SkinCeuticals'`)))!.id;
    await db.asUser(A, (tx) => tx.q(`insert into share_artifacts (share_slug, creator_user_id, entity_type, entity_id) values ('prod12345', $1, 'user_product', $2)`, [A, prodA]));
    const pub = await db.asAnon((tx) => tx.one<{ s: { product: { brand: string; name: string } } }>(`select public_share('prod12345') as s`));
    expect(pub!.s.product).toMatchObject({ brand: 'SkinCeuticals', name: 'CE Ferulic' });
    expect(JSON.stringify(pub)).not.toContain('private note');
    const id = (await db.asUser(B, (tx) => tx.one<{ id: string }>(`select wishlist_from_product_share('prod12345') as id`)))!.id;
    expect(await db.asUser(B, (tx) => tx.one(`select state::text as state, affiliate_url from user_products where id = $1`, [id]))).toEqual({ state: 'wishlist', affiliate_url: 'https://shop.test/ce' });
    await expect(db.asAnon((tx) => tx.q(`select wishlist_from_product_share('prod12345')`))).rejects.toThrow(/permission denied/);
  });
});
