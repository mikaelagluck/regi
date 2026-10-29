import 'server-only';
import type { Db, Params, Tx } from './types';

export type { Db, Tx } from './types';
export { DbError } from './types';

type RawQuery = (sql: string, params?: Params) => Promise<Record<string, unknown>[]>;

/** Wrap a raw transactional query function with role switching. */
export function makeTx(raw: RawQuery, restoreRole: string | null): Tx {
  const tx: Tx = {
    q: async <T,>(sql: string, params?: Params) => (await raw(sql, params)) as T[],
    one: async <T,>(sql: string, params?: Params) => ((await raw(sql, params))[0] as T) ?? null,
    elevated: async <T,>(fn: (t: Tx) => Promise<T>) => {
      if (!restoreRole) return fn(tx);
      await raw('reset role');
      try {
        return await fn(makeTx(raw, null));
      } finally {
        await raw(`set local role ${restoreRole}`);
      }
    },
  };
  return tx;
}

export async function enterRole(raw: RawQuery, role: 'authenticated' | 'anon', userId?: string) {
  const claims = userId ? { sub: userId, role } : { role };
  await raw(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
  await raw(`set local role ${role}`);
}

declare global {
  var __regiDb: Promise<Db> | undefined;
}

/** Postgres via DATABASE_URL when set (Supabase); otherwise the Docker-free local PGlite database. */
export function getDb(): Promise<Db> {
  if (!globalThis.__regiDb) {
    globalThis.__regiDb = process.env.DATABASE_URL
      ? import('./pg').then((m) => m.createPgDb(process.env.DATABASE_URL!))
      : import('./pglite').then((m) => m.createPgliteDb());
    globalThis.__regiDb.catch(() => {
      globalThis.__regiDb = undefined;
    });
  }
  return globalThis.__regiDb;
}

export async function asUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return (await getDb()).asUser(userId, fn);
}
export async function asAnon<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return (await getDb()).asAnon(fn);
}
export async function asService<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return (await getDb()).asService(fn);
}
