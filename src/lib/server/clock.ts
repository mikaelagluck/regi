import 'server-only';
import { cookies } from 'next/headers';
import { logicalDate } from '@/lib/logicalDate';

export const TIME_OFFSET_COOKIE = 'regi_time_offset';

function travelAllowed() {
  return process.env.ALLOW_TIME_TRAVEL === '1' || (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** Server "now". Tests (and local dev) can shift it with the regi_time_offset cookie. */
export async function serverNow(): Promise<Date> {
  if (!travelAllowed()) return new Date();
  const store = await cookies();
  const offset = Number(store.get(TIME_OFFSET_COOKIE)?.value ?? 0);
  return new Date(Date.now() + (Number.isFinite(offset) ? offset : 0));
}

export async function todayFor(timezone: string): Promise<string> {
  return logicalDate(await serverNow(), timezone);
}

export { travelAllowed };
