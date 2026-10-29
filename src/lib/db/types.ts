export type Params = unknown[];

/** A query runner bound to one transaction. */
export interface Tx {
  /** All rows. */
  q<T = Record<string, unknown>>(sql: string, params?: Params): Promise<T[]>;
  /** First row or null. */
  one<T = Record<string, unknown>>(sql: string, params?: Params): Promise<T | null>;
  /**
   * Run statements with the server's own privileges (bypasses RLS) inside the same transaction.
   * Only for server-computed values users must not write directly: streak/lifetime counters,
   * rollover, notification dispatch. Never pass user-chosen row ids here without scoping.
   */
  elevated<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
}

export interface Db {
  /** Run as the signed-in user: role `authenticated`, auth.uid() = userId. RLS applies. */
  asUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T>;
  /** Run as a signed-out visitor: role `anon`. */
  asAnon<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  /** Server-only jobs (cron, account deletion, dev auth). */
  asService<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
}

export class DbError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
