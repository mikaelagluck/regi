import { TopBar } from '@/components/atoms';
import { RegimenRow } from '@/components/regimens/RegimensScreen';
import { requireProfile } from '@/lib/auth/session';
import { withDay } from '@/lib/server/context';
import { listRegimens } from '@/lib/server/regimens';
import s from './archived.module.css';

export const metadata = { title: 'Archived regimens' };

/** Archive surface (B5.1 "Archived (N)"). */
export default async function ArchivedPage() {
  const { profile } = await requireProfile();
  const list = await withDay(profile, (tx, ctx) => listRegimens(tx, ctx.today, { archived: true }));
  return (
    <>
      <TopBar back={{ href: '/regimens' }} title="Archived" />
      <div className={s.body}>
        <p className="t-caption">Archived regimens don’t appear on Today. Open one to restore it.</p>
        {list.length ? (
          <ul className={s.list}>{list.map((r) => <li key={r.id}><RegimenRow r={r} /></li>)}</ul>
        ) : (
          <p className="t-secondary">Nothing archived.</p>
        )}
      </div>
    </>
  );
}
