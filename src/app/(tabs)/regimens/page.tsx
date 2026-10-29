import { RegimensScreen } from '@/components/regimens/RegimensScreen';
import { requireProfile } from '@/lib/auth/session';
import { withDay } from '@/lib/server/context';
import { listRegimens } from '@/lib/server/regimens';

export const metadata = { title: 'Regimens' };

export default async function RegimensPage({ searchParams }: { searchParams: Promise<{ folder?: string }> }) {
  const { profile } = await requireProfile();
  const folder = (await searchParams).folder === 'shared' ? 'shared' : 'mine';
  const { list, archived } = await withDay(profile, async (tx, ctx) => ({
    list: await listRegimens(tx, ctx.today),
    archived: (await tx.one<{ n: number }>('select count(*)::int as n from regimens where is_archived'))?.n ?? 0,
  }));
  return <RegimensScreen regimens={list} archivedCount={archived} folder={folder} />;
}
