import 'server-only';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { supabaseConfigured } from '@/lib/auth/config';
import { supabaseAdmin } from '@/lib/auth/supabase';
import { badRequest } from './api';

const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function localUploadDir() {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.REGI_DATA_DIR ?? '.data/pglite', '..', 'uploads');
}

/**
 * Product photo upload (C1.2: per-user prefix). Supabase Storage when configured; otherwise a
 * local folder served by /api/uploads for Docker-free development.
 */
export async function uploadProductPhoto(userId: string, file: File): Promise<string> {
  const ext = TYPES[file.type];
  if (!ext) throw badRequest('Use a JPEG, PNG, WebP or HEIC image');
  if (file.size > MAX_UPLOAD_BYTES) throw badRequest('Images must be 5 MB or smaller');
  const key = `${userId}/${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (supabaseConfigured()) {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'product-photos';
    const admin = supabaseAdmin();
    const { error } = await admin.storage.from(bucket).upload(key, bytes, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return admin.storage.from(bucket).getPublicUrl(key).data.publicUrl;
  }
  const dest = path.join(localUploadDir(), key);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, bytes);
  return `/api/uploads/${key}`;
}
