import 'server-only';
import { NextResponse } from 'next/server';

/** Cron endpoints require `Authorization: Bearer $CRON_SECRET` (pg_cron/pg_net or Vercel Cron). */
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
