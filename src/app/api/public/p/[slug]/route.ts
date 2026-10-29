import { NextResponse } from 'next/server';
import { asAnon } from '@/lib/db';
import { publicShare } from '@/lib/server/shares';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const s = await asAnon((tx) => publicShare(tx, slug));
  if (!s || s.entity_type !== 'user_product') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(s, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}
