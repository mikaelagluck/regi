import 'server-only';
import { cache } from 'react';
import { asAnon } from '@/lib/db';
import type { PublicShare } from '@/lib/types';
import { publicShare } from './shares';

/** Public share payload, memoised per request (page + metadata + OG image). Never reads cookies. */
export const loadPublicShare = cache(async (slug: string): Promise<PublicShare | null> => asAnon((tx) => publicShare(tx, slug)));
