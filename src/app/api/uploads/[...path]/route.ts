import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { localUploadDir } from '@/lib/server/storage';

const MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' };

/** Serves locally stored photos in Docker-free development (production uses Supabase Storage URLs). */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const parts = (await ctx.params).path;
  const root = localUploadDir();
  const file = path.resolve(root, ...parts);
  if (!file.startsWith(root + path.sep)) return new NextResponse('Not found', { status: 404 });
  try {
    const data = await fs.readFile(file);
    return new NextResponse(new Uint8Array(data), { headers: { 'Content-Type': MIME[path.extname(file).slice(1)] ?? 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' } });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
