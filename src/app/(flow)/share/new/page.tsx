import { notFound } from 'next/navigation';
import { ShareCreate } from '@/components/share/ShareCreate';
import { requireProfile } from '@/lib/auth/session';
import { asUser } from '@/lib/db';

export const metadata = { title: 'Share' };

/** [share-create] B7.1 */
export default async function ShareNewPage({ searchParams }: { searchParams: Promise<{ type?: string; id?: string }> }) {
  const { profile } = await requireProfile();
  const { type, id } = await searchParams;
  if ((type !== 'regimen' && type !== 'user_product') || !id || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const row = await asUser(profile.id, (tx) =>
    type === 'regimen'
      ? tx.one<{ name: string }>('select name from regimens where id = $1', [id])
      : tx.one<{ name: string }>(`select brand || ' ' || name as name from user_products where id = $1`, [id]),
  );
  if (!row) notFound();
  return <ShareCreate type={type} id={id} name={row.name} />;
}
