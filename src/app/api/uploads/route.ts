import { authed, badRequest } from '@/lib/server/api';
import { uploadProductPhoto } from '@/lib/server/storage';

/** Product photo upload (Supabase Storage, per-user prefix). */
export const POST = authed(async ({ req, user }) => {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw badRequest('Attach an image');
  return { url: await uploadProductPhoto(user.id, file) };
});
