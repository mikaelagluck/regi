import { CopyRunner } from '@/components/share/CopyRunner';
import { requireProfile } from '@/lib/auth/session';

export const metadata = { title: 'Copying regimen', robots: { index: false } };

/**
 * "Copy to my regimens" (CLAUDE.md platform translation). Signed out → sign in/up with the slug
 * preserved in `next`; signed in → copy and go to the new regimen.
 */
export default async function CopyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireProfile(`/r/${slug}/copy`);
  return <CopyRunner slug={slug} />;
}
