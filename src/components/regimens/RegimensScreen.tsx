'use client';
import { IconArchive, IconChevronRight, IconListCheck, IconPlus, IconUser, IconUsers } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Badge, ButtonLink, EmptyState, IconActionLink, Pill, PillGroup, TopBar } from '@/components/atoms';
import { TOD_ICON } from '@/components/atoms/todIcons';
import { formatDateRange } from '@/lib/logicalDate';
import { TIME_OF_DAY_LABEL, TIMES_OF_DAY, type TimeOfDay } from '@/lib/schedule';
import type { RegimenSummary } from '@/lib/types';
import s from './RegimensScreen.module.css';


export function RegimenRow({ r }: { r: RegimenSummary }) {
  return (
    <Link href={`/regimens/${r.id}`} className={s.row} data-testid="regimen-row">
      <span className={s.rowText}>
        <span className={s.rowTitle}>
          {r.name}
          {r.schedule.range && <Badge tone="info">{formatDateRange(r.schedule.range.from, r.schedule.range.to)}</Badge>}
        </span>
        <span className={s.rowSub}>{r.step_count} step{r.step_count === 1 ? '' : 's'} · {r.schedule.text}</span>
      </span>
      <IconChevronRight size={16} className={s.chev} aria-hidden />
    </Link>
  );
}

function TodGroups({ list }: { list: RegimenSummary[] }) {
  return (
    <>
      {TIMES_OF_DAY.map((tod: TimeOfDay) => {
        const items = list.filter((r) => r.time_of_day === tod);
        if (!items.length) return null; // B5.1: empty groups hidden
        const Icon = TOD_ICON[tod];
        return (
          <section key={tod} className={s.group} aria-labelledby={`g-${tod}`}>
            <h2 id={`g-${tod}`} className={s.groupHead}>
              <span className={s.groupLabel}><Icon size={14} aria-hidden /> {TIME_OF_DAY_LABEL[tod]}</span>
              <span className={s.count}>{items.length}</span>
            </h2>
            <ul className={s.list}>
              {items.map((r) => <li key={r.id}><RegimenRow r={r} /></li>)}
            </ul>
          </section>
        );
      })}
    </>
  );
}

/** [regimens-01] B5.1 — Mine / Shared, grouped by time of day; Shared grouped by recipient label (conflict #8). */
export function RegimensScreen({ regimens, archivedCount, folder }: { regimens: RegimenSummary[]; archivedCount: number; folder: 'mine' | 'shared' }) {
  const router = useRouter();
  const pathname = usePathname();
  const mine = regimens.filter((r) => !r.target_user_label);
  const shared = regimens.filter((r) => r.target_user_label);
  const labels = [...new Set(shared.map((r) => r.target_user_label!))].sort();

  const header = <TopBar large title="Regimens" trailing={<IconActionLink label="Create a regimen" href="/regimens/new"><IconPlus size={24} aria-hidden /></IconActionLink>} />;

  if (!regimens.length && !archivedCount) {
    return (
      <>
        {header}
        <EmptyState
          icon={<IconListCheck size={28} stroke={1.5} />}
          title="Every great skin day starts with a regimen."
          body="Build your morning or evening steps once, then check them off every day."
          action={<ButtonLink href="/regimens/new" variant="primary">Create a regimen</ButtonLink>}
        />
      </>
    );
  }

  return (
    <>
      {header}
      <div className={s.tabs}>
        <PillGroup label="Folder">
          <Pill active={folder === 'mine'} icon={<IconUser size={15} aria-hidden />} onClick={() => router.replace(pathname)}>Mine {mine.length}</Pill>
          <Pill active={folder === 'shared'} icon={<IconUsers size={15} aria-hidden />} onClick={() => router.replace(`${pathname}?folder=shared`)}>Shared {shared.length}</Pill>
        </PillGroup>
      </div>

      <div className={s.body}>
        {folder === 'mine' && (mine.length ? <TodGroups list={mine} /> : <p className={s.none}>No regimens of your own yet.</p>)}
        {folder === 'shared' &&
          (labels.length ? (
            labels.map((label) => (
              <section key={label} className={s.labelGroup}>
                <h2 className={s.recipient}>For {label}</h2>
                <TodGroups list={shared.filter((r) => r.target_user_label === label)} />
              </section>
            ))
          ) : (
            <p className={s.none}>Regimens you build for someone else (set “For” in the builder) show up here.</p>
          ))}

        {archivedCount > 0 && (
          <Link href="/regimens/archived" className={s.archived}>
            <IconArchive size={16} aria-hidden /> Archived ({archivedCount})
          </Link>
        )}
      </div>
    </>
  );
}
