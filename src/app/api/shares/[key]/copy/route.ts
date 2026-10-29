import { asUser } from '@/lib/db';
import { authed } from '@/lib/server/api';
import { copyShared } from '@/lib/server/shares';

/** C4.6 POST /shares/:slug/copy — copies the shared regimen to the caller (B7.4). */
export const POST = authed<{ key: string }>(async ({ profile, params }) => ({ id: await asUser(profile.id, (tx) => copyShared(tx, params.key)) }));
