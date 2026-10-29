import 'server-only';
import pg from 'pg';
import { enterRole, makeTx } from './index';
import type { Db, Params, Tx } from './types';

// Keep DATE columns as "YYYY-MM-DD" strings and timestamps as ISO strings (same as PGlite).
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1184, (v) => new Date(v).toISOString());
pg.types.setTypeParser(1114, (v) => new Date(`${v}Z`).toISOString());

export function createPgDb(connectionString: string): Db {
  const pool = new pg.Pool({ connectionString, max: 5, ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? undefined : { rejectUnauthorized: false } });

  async function run<T>(role: 'authenticated' | 'anon' | null, userId: string | undefined, fn: (tx: Tx) => Promise<T>) {
    const client = await pool.connect();
    const raw = async (sql: string, params?: Params) => (await client.query(sql, params as unknown[])).rows;
    try {
      await client.query('begin');
      if (role) await enterRole(raw, role, userId);
      const out = await fn(makeTx(raw, role));
      await client.query('commit');
      return out;
    } catch (e) {
      await client.query('rollback').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  return {
    asUser: (userId, fn) => run('authenticated', userId, fn),
    asAnon: (fn) => run('anon', undefined, fn),
    asService: (fn) => run(null, undefined, fn),
  };
}
