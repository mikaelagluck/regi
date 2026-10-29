import { NextResponse } from 'next/server';
import { asService } from '@/lib/db';
import { cronAuthorized, unauthorized } from '@/lib/server/cron';
import { dispatchDue } from '@/lib/server/notifications';

export const dynamic = 'force-dynamic';

/** Every minute: queue regimen reminders and send due pushes (timer completion, reminders, share activity). */
async function run(req: Request) {
  if (!cronAuthorized(req)) return unauthorized();
  const result = await asService((tx) => dispatchDue(tx, new Date()));
  return NextResponse.json({ ok: true, ...result });
}

export const GET = run;
export const POST = run;
