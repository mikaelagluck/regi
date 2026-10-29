import { IconCalendarEvent, IconChevronRight, IconPencil, IconShare2 } from '@tabler/icons-react';
import Link from 'next/link';
import { Fragment } from 'react';
import { StepRow, TopBar, WaitStrip } from '@/components/atoms';
import { ArchiveAction } from '@/components/regimens/ArchiveAction';
import { CreatedToast } from '@/components/regimens/CreatedToast';
import { TOD_ICON } from '@/components/atoms/todIcons';
import { requireProfile } from '@/lib/auth/session';
import { formatDateRange } from '@/lib/logicalDate';
import { TIME_OF_DAY_LABEL } from '@/lib/schedule';
import { withDay } from '@/lib/server/context';
import { orNotFound } from '@/lib/server/pages';
import { getRegimen, stepLabel } from '@/lib/server/regimens';
import { STEP_TYPE_LABEL } from '@/lib/stepTypes';
import { formatWait } from '@/lib/timer';
import s from './detail.module.css';

/** [regimen-detail] B5.2 — steps scroll above a sticky action footer. */
export default async function RegimenDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ toast?: string }> }) {
  const { profile } = await requireProfile();
  const { id } = await params;
  const { toast } = await searchParams;
  const r = await orNotFound(withDay(profile, (tx, ctx) => getRegimen(tx, id, ctx.today)));
  const Icon = TOD_ICON[r.time_of_day];
  const schedule = r.schedule.range ? `${formatDateRange(r.schedule.range.from, r.schedule.range.to)} · daily during trip` : r.schedule.text;

  return (
    <div className={s.page}>
      <TopBar back={{ href: r.is_archived ? '/regimens/archived' : '/regimens' }} />
      <div className={s.scroll}>
        <header className={s.head}>
          <h1 className="t-title">{r.name}</h1>
          <p className={s.meta}>
            <Icon size={14} aria-hidden /> {TIME_OF_DAY_LABEL[r.time_of_day]} · {schedule}
            {r.target_user_label && <> · For {r.target_user_label}</>}
          </p>
          {r.reminder_time && <p className="t-caption">Reminder at {r.reminder_time.slice(0, 5)}</p>}
        </header>

        {r.steps.length ? (
          <ol className={s.steps}>
            {r.steps.map((st, i) => (
              <Fragment key={st.id}>
                <li>
                  <StepRow lead="number" index={i} title={stepLabel(st)} subtitle={[STEP_TYPE_LABEL[st.step_type], st.brand].filter(Boolean).join(' · ')} />
                </li>
                {st.wait_seconds_after > 0 && i < r.steps.length - 1 && (
                  <li aria-label={`Wait ${formatWait(st.wait_seconds_after)}`}>
                    <WaitStrip>Wait {formatWait(st.wait_seconds_after)}</WaitStrip>
                  </li>
                )}
              </Fragment>
            ))}
          </ol>
        ) : (
          <p className="t-secondary">No steps yet.</p>
        )}
      </div>

      <nav className={s.footer} aria-label="Regimen actions">
        <Link href={`/regimens/${r.id}/edit`} className={s.action}><IconPencil size={18} aria-hidden /><span>Edit steps</span><IconChevronRight size={16} aria-hidden className={s.chev} /></Link>
        <Link href={`/regimens/${r.id}/schedule`} className={s.action}><IconCalendarEvent size={18} aria-hidden /><span>Edit schedule</span><IconChevronRight size={16} aria-hidden className={s.chev} /></Link>
        <Link href={`/share/new?type=regimen&id=${r.id}`} className={`${s.action} ${s.share}`}><IconShare2 size={18} aria-hidden /><span>Share</span><IconChevronRight size={16} aria-hidden className={s.chev} /></Link>
        <ArchiveAction id={r.id} name={r.name} archived={r.is_archived} className={s.action} />
      </nav>
      {toast && <CreatedToast kind={toast} />}
    </div>
  );
}
