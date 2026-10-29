import 'server-only';
import { PGlite, types } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { enterRole, makeTx } from './index';
import type { Db, Params, Tx } from './types';

// Docker-free local Postgres (PGlite = Postgres compiled to WASM). Applies the exact Supabase
// migrations on first boot, preceded by supabase/local-shim.sql (roles + auth schema).

const root = /* turbopackIgnore: true */ process.cwd();

async function migrate(db: PGlite) {
  const exists = await db.query<{ ok: boolean }>(
    `select to_regclass('public.users') is not null as ok`,
  );
  if (exists.rows[0]?.ok) return;
  await db.exec(fs.readFileSync(path.join(/* turbopackIgnore: true */ root, 'supabase/local-shim.sql'), 'utf8'));
  const dir = path.join(/* turbopackIgnore: true */ root, 'supabase/migrations');
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
  }
  await db.exec(fs.readFileSync(path.join(/* turbopackIgnore: true */ root, 'supabase/seed.sql'), 'utf8'));
}

export async function openPglite(dataDir?: string): Promise<PGlite> {
  const db = new PGlite(dataDir, {
    parsers: {
      [types.DATE]: (v: string) => v,
      [types.TIMESTAMPTZ]: (v: string) => new Date(v).toISOString(),
      [types.TIMESTAMP]: (v: string) => new Date(`${v}Z`).toISOString(),
    },
  });
  await db.waitReady;
  await migrate(db);
  return db;
}

export async function createPgliteDb(): Promise<Db> {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_AUTH !== '1') {
    throw new Error('DATABASE_URL is required in production (local PGlite is for development only).');
  }
  const dir = path.resolve(/* turbopackIgnore: true */ root, process.env.REGI_DATA_DIR ?? '.data/pglite');
  if (process.env.REGI_RESET_DB === '1') fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const db = await openPglite(dir);
  return pgliteDb(db);
}

export function pgliteDb(db: PGlite): Db {
  async function run<T>(role: 'authenticated' | 'anon' | null, userId: string | undefined, fn: (tx: Tx) => Promise<T>) {
    return db.transaction(async (t) => {
      const raw = async (sql: string, params?: Params) => (await t.query<Record<string, unknown>>(sql, params as unknown[])).rows;
      if (role) await enterRole(raw, role, userId);
      return fn(makeTx(raw, role));
    });
  }
  return {
    asUser: (userId, fn) => run('authenticated', userId, fn),
    asAnon: (fn) => run('anon', undefined, fn),
    asService: (fn) => run(null, undefined, fn),
  };
}
