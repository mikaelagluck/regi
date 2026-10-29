import { NextResponse } from 'next/server';
import { asAnon } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const row = await asAnon((tx) => tx.one<{ n: number }>('select count(*)::int as n from categories'));
    return NextResponse.json({ ok: true, categories: row?.n ?? 0 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 503 });
  }
}
