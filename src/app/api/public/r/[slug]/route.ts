import { NextResponse } from 'next/server';
import { asAnon } from '@/lib/db';
import { publicShare } from '@/lib/server/shares';

/** C4.6 GET /public/r/:slug — public regimen share payload (CDN-cached 60s, C5.3). */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const s = await asAnon((tx) => publicShare(tx, slug));
  if (!s || s.entity_type !== 'regimen') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(s, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}
