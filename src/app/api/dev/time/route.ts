import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { body, errorResponse } from '@/lib/server/api';
import { TIME_OFFSET_COOKIE, travelAllowed } from '@/lib/server/clock';

/** Test/dev only: shift the server clock (advance the logical day). Disabled unless ALLOW_TIME_TRAVEL=1. */
export async function POST(req: Request) {
  if (!travelAllowed()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const { offsetMs, advanceDays } = await body(req, z.object({ offsetMs: z.number().optional(), advanceDays: z.number().optional() }));
    const store = await cookies();
    const current = Number(store.get(TIME_OFFSET_COOKIE)?.value ?? 0);
    const next = offsetMs ?? current + (advanceDays ?? 0) * 86_400_000;
    store.set(TIME_OFFSET_COOKIE, String(next), { path: '/', sameSite: 'lax' });
    return NextResponse.json({ offsetMs: next });
  } catch (e) {
    return errorResponse(e);
  }
}
