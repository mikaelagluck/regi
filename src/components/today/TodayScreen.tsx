'use client';
import { IconCheckbox, IconChevronLeft, IconChevronRight, IconHistory, IconNotes, IconPlayerSkipForward, IconReplace, IconBan } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import { BottomSheet, Button, ButtonLink, EmptyState, Pill, PillGroup, ProgressFill, StepRow, StreakCard, Toast, ToastHost } from '@/components/atoms';
import { TOD_ICON } from '@/components/atoms/todIcons';
import { api } from '@/lib/client/api';
import { addDays, formatShortDate, type LogicalDate } from '@/lib/logicalDate';
import { TIME_OF_DAY_LABEL } from '@/lib/schedule';
import { STEP_TYPE_LABEL } from '@/lib/stepTypes';
import { defaultRegimenIndex, formatRemainingLong, formatWait, timerState } from '@/lib/timer';
import type { CheckResult, DayPayload, DayRegimen, DayStep } from '@/lib/types';
import { EditScopeSheet, type EditRequest } from './EditScopeSheet';
import { SuccessMoment, type SuccessData } from './SuccessMoment';
import s from './TodayScreen.module.css';

interface Props {
  initial: DayPayload;
  /** Base path for date navigation ("/today" or "/calendar?view=day"). */
  basePath?: string;
  /** Rendered above the streaks (Calendar Day view's week strip). */
  header?: React.ReactNode;
  hideDateNav?: boolean;
}

/** Client clock aligned to the server (and to test time travel). */
function clientNow(offsetMs: number) {
  return Date.now() + offsetMs;
}

function dayLabel(date: LogicalDate, today: LogicalDate) {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  if (date === addDays(today, 1)) return 'Tomorrow';
  return formatShortDate(date).split(',')[0];
}

/** [today-01] / [timer-states] / [empty-today] — B3. */
export function TodayScreen({ initial, basePath = '/today', header, hideDateNav }: Props) {
  const router = useRouter();
  const [day, setDay] = useState(initial);
  const [clockOffset, setClockOffset] = useState(() => Date.parse(initial.serverNow) - Date.now());
  const [selected, setSelected] = useState(() => defaultRegimenIndex(initial.regimens.map((r) => ({ completed: !!r.completed_at }))));
  const [skipWait, setSkipWait] = useState<{ timed: DayStep; target: DayStep; remaining: number } | null>(null);
  const [menu, setMenu] = useState<DayStep | null>(null);
  const [edit, setEdit] = useState<{ step: DayStep; action: 'skip' | 'swap' } | null>(null);
  const [detail, setDetail] = useState<DayStep | null>(null);
  const [journal, setJournal] = useState(false);
  const [note, setNote] = useState('');
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const r: DayRegimen | undefined = day.regimens[Math.min(Math.max(selected, 0), day.regimens.length - 1)];
  const isFuture = day.date > day.today;
  const isPast = day.date < day.today;
  const base = (r ? `/api/day/${day.date}/regimens/${r.regimen_id}` : '') as string;
  const nowMs = () => clientNow(clockOffset);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const apply = useCallback((next: DayPayload) => {
    setDay(next);
    setClockOffset(Date.parse(next.serverNow) - clientNow(0));
  }, []);

  const runningTimer = useMemo(() => {
    if (!r) return null;
    const t = r.steps.find((st) => st.timer_started_at && !st.checked_at);
    if (!t) return null;
    return t;
  }, [r]);

  async function mutate<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError((e as Error).message);
      router.refresh();
      return undefined;
    }
  }

  function optimistic(stepKey: string, patch: Partial<DayStep>) {
    setDay((d) => ({
      ...d,
      regimens: d.regimens.map((x) => (x.regimen_id !== r?.regimen_id ? x : { ...x, steps: x.steps.map((st) => (st.key === stepKey ? { ...st, ...patch } : st)) })),
    }));
  }

  async function check(step: DayStep, checked: boolean) {
    optimistic(step.key, { checked_at: checked ? new Date(nowMs()).toISOString() : null, timer_started_at: null });
    const res = await mutate(() => api<CheckResult>(`${base}/steps/${encodeURIComponent(step.key)}/check`, { method: checked ? 'POST' : 'DELETE' }));
    if (!res) return;
    apply(res.day);
    if (res.completed && day.date === day.today) setSuccess(res.completed);
  }

  async function startTimer(step: DayStep) {
    optimistic(step.key, { timer_started_at: new Date(nowMs()).toISOString() });
    const res = await mutate(() => api<DayPayload>(`${base}/steps/${encodeURIComponent(step.key)}/timer-start`, { method: 'POST' }));
    if (res) apply(res);
    if ('Notification' in window && Notification.permission === 'default' && day.date === day.today) {
      // Ask once, in context, so the wait-timer push can reach you if you leave the app (B3.6).
      Notification.requestPermission().then((p) => p === 'granted' && import('@/lib/client/push').then((m) => m.subscribePush())).catch(() => {});
    }
  }

  function remainingOf(st: DayStep) {
    return timerState(st.timer_started_at!, st.wait_seconds_after, nowMs()).remainingSeconds;
  }

  /** Checkbox tap: starts a wait, or checks — via the skip-wait sheet if a wait is still running (B3.7). */
  function onToggle(step: DayStep, next: boolean) {
    if (!r || isFuture) return;
    if (!next) return void check(step, false);
    if (runningTimer) {
      const remaining = remainingOf(runningTimer);
      const idxTimer = r.steps.findIndex((x) => x.key === runningTimer.key);
      const idxTarget = r.steps.findIndex((x) => x.key === step.key);
      if (remaining > 0 && idxTarget >= idxTimer) {
        setSkipWait({ timed: runningTimer, target: step, remaining });
        return;
      }
    }
    const isLast = r.steps.filter((x) => !x.checked_at).length === 1;
    if (step.wait_seconds_after > 0 && !step.timer_started_at && !isLast && !isPast) return void startTimer(step);
    void check(step, true);
  }

  async function continueAnyway() {
    if (!skipWait) return;
    const { timed, target } = skipWait;
    setSkipWait(null);
    await check(timed, true);
    if (target.key !== timed.key) await check(target, true);
  }

  async function onTimerDone(step: DayStep) {
    const next = r?.steps.slice(r.steps.findIndex((x) => x.key === step.key) + 1).find((x) => !x.checked_at);
    flash(next ? `Wait’s over — time for ${next.label}.` : `${step.label} is done.`);
    await check(step, true);
  }

  async function confirmEdit(req: EditRequest) {
    if (!edit || !r) return;
    const res = await mutate(() => api<DayPayload>(`${base}/steps/${encodeURIComponent(edit.step.key)}`, { method: 'PATCH', body: req }));
    if (res) {
      apply(res);
      flash(req.scope === 'today' ? 'Changed for today only.' : req.scope === 'forward' ? 'Changed from today on. Past days unchanged.' : 'Changed for the days you picked.');
    }
  }

  async function saveJournal() {
    if (!r) return;
    const res = await mutate(() => api<DayPayload>(`/api/day/${day.date}/journal`, { method: 'PATCH', body: { regimen_id: r.regimen_id, note } }));
    if (res) apply(res);
    setJournal(false);
  }

  async function toggleSkip() {
    if (!r) return;
    const res = await mutate(() => api<DayPayload>(`${base}/skip`, { body: { skipped: !r.skipped } }));
    if (res) apply(res);
  }

  const go = (d: LogicalDate) => router.push(`${basePath}${basePath.includes('?') ? '&' : '?'}date=${d}`, { scroll: false });

  const dateNav = !hideDateNav && (
    <header className={s.header}>
      <button type="button" className={s.chev} onClick={() => go(addDays(day.date, -1))} aria-label="Previous day"><IconChevronLeft size={22} aria-hidden /></button>
      <button type="button" className={s.date} onClick={() => dateInput.current?.showPicker?.() ?? dateInput.current?.click()} >
        <span className={s.dateLabel}>{dayLabel(day.date, day.today)}</span>
        <span className={s.dateFull}>{formatShortDate(day.date)}<span className="sr-only">, choose a date</span></span>
      </button>
      <input ref={dateInput} type="date" className={s.hiddenDate} value={day.date} onChange={(e) => e.target.value && go(e.target.value)} tabIndex={-1} aria-hidden />
      <button type="button" className={s.chev} onClick={() => go(addDays(day.date, 1))} aria-label="Next day"><IconChevronRight size={22} aria-hidden /></button>
    </header>
  );

  if (!day.hasAnyRegimen) {
    return (
      <>
        {dateNav}
        {header}
        <EmptyState
          icon={<IconCheckbox size={28} stroke={1.5} />}
          title="No regimens yet"
          body="Set up a regimen and it'll show up here every morning and night."
          action={<ButtonLink href="/regimens/new" variant="primary">Create a regimen</ButtonLink>}
        />
      </>
    );
  }

  return (
    <div className={s.screen}>
      {dateNav}
      {header}
      {day.date !== day.today && (
        <p className={s.notice}>
          <IconHistory size={14} aria-hidden />
          {isPast ? 'Logging a past day. Checks here are marked as logged later.' : 'Looking ahead — you can check steps off on the day.'}
          <Link href={basePath} className="t-link">Back to today</Link>
        </p>
      )}

      <div className={s.streaks}>
        <StreakCard kind="streak" value={day.streak} label="Perfect day streak" />
        <StreakCard kind="completed" value={day.lifetime} label="Regimens completed" />
      </div>

      {day.regimens.length === 0 ? (
        <div className={s.none}>
          <p className={s.noneTitle}>Nothing scheduled {day.date === day.today ? 'today' : 'this day'}.</p>
          <p className="t-caption">Your regimens run on the days you set in their schedule.</p>
          <ButtonLink href="/regimens" variant="outline" size="sm">See regimens</ButtonLink>
        </div>
      ) : (
        <>
          {day.regimens.length > 1 && (
            <div className={s.pills}>
              <PillGroup label="Regimens today">
                {day.regimens.map((x, i) => {
                  const I = TOD_ICON[x.time_of_day];
                  return (
                    <Pill key={x.regimen_id} active={x.regimen_id === r?.regimen_id} onClick={() => setSelected(i)} icon={<I size={16} aria-hidden />} controls="steps-panel">
                      {TIME_OF_DAY_LABEL[x.time_of_day]}{x.completed_at ? ' ✓' : ''}
                    </Pill>
                  );
                })}
              </PillGroup>
            </div>
          )}

          {r && (
            <section id="steps-panel" role="tabpanel" aria-label={`${r.name}`} className={s.panel}>
              <div className={s.progressHead}>
                <span className={s.regimenName}>{day.regimens.length === 1 && (() => { const I = TOD_ICON[r.time_of_day]; return <I size={15} aria-hidden />; })()} {r.name}</span>
                <span className={s.progressText} aria-live="polite">
                  {r.skipped ? 'Skipped' : `${r.done_count} of ${r.total} done`}
                  <span className={s.pct}>{r.total ? Math.round((r.done_count / r.total) * 100) : 0}%</span>
                </span>
              </div>
              <ProgressFill value={r.total ? r.done_count / r.total : 0} label={`${r.done_count} of ${r.total} steps done`} />

              <ol className={s.steps}>
                {r.steps.map((st, i) => {
                  const next = r.steps.slice(i + 1).find((x) => !x.checked_at);
                  const firstOpen = r.steps.find((x) => !x.checked_at && !(x.timer_started_at && !x.checked_at));
                  return (
                    <Fragment key={st.key}>
                      <li>
                        <StepRow
                          testId={`step-${i}`}
                          title={st.label}
                          subtitle={[STEP_TYPE_LABEL[st.step_type], st.brand].filter(Boolean).join(' · ')}
                          checked={!!st.checked_at}
                          retroactive={st.retroactive}
                          active={!runningTimer && firstOpen?.key === st.key && !r.completed_at}
                          onToggle={(v) => onToggle(st, v)}
                          timer={st.timer_started_at && !st.checked_at ? { startedAt: st.timer_started_at, waitSeconds: st.wait_seconds_after, nextName: next?.label, clockOffsetMs: clockOffset } : null}
                          onTimerDone={() => onTimerDone(st)}
                          onOpen={() => (st.user_product_id ? router.push(`/products/${st.user_product_id}`) : setDetail(st))}
                          onMore={isFuture ? undefined : () => setMenu(st)}
                        />
                      </li>
                    </Fragment>
                  );
                })}
              </ol>

              <button type="button" className={s.note} onClick={() => { setNote(r.journal_note ?? ''); setJournal(true); }}>
                <IconNotes size={16} aria-hidden />
                {r.journal_note ? <span className={s.noteText}>{r.journal_note}</span> : <span className="t-secondary">Add today&apos;s note (optional)</span>}
              </button>

              {!isFuture && !r.completed_at && (
                <button type="button" className={s.skip} onClick={toggleSkip}>
                  {r.skipped ? <><IconPlayerSkipForward size={14} aria-hidden /> Undo skip</> : <><IconBan size={14} aria-hidden /> Skip this regimen {day.date === day.today ? 'today' : 'on this day'}</>}
                </button>
              )}
            </section>
          )}
        </>
      )}

      {error && <p role="alert" className={s.error}>{error}</p>}

      <BottomSheet
        open={!!skipWait}
        onClose={() => setSkipWait(null)}
        title={skipWait ? `You still have ${formatRemainingLong(skipWait.remaining)} left on the wait. Continue anyway?` : ''}
        footer={<><Button variant="ghost" onClick={() => setSkipWait(null)}>Cancel</Button><Button variant="primary" onClick={continueAnyway}>Continue</Button></>}
      />

      <BottomSheet open={!!menu} onClose={() => setMenu(null)} title={menu?.label ?? ''}>
        <ul className={s.menu}>
          <li><button type="button" className={s.menuItem} onClick={() => { setEdit({ step: menu!, action: 'skip' }); setMenu(null); }}><IconBan size={18} aria-hidden /> Skip this step</button></li>
          <li><button type="button" className={s.menuItem} onClick={() => { setEdit({ step: menu!, action: 'swap' }); setMenu(null); }}><IconReplace size={18} aria-hidden /> Swap product</button></li>
        </ul>
      </BottomSheet>

      <EditScopeSheet open={!!edit} onClose={() => setEdit(null)} step={edit?.step ?? null} action={edit?.action ?? 'skip'} regimenName={r?.name ?? ''} date={day.date} onConfirm={confirmEdit} />

      <BottomSheet open={!!detail} onClose={() => setDetail(null)} title={detail?.label ?? ''}>
        {detail && (
          <dl className={s.detail}>
            <div><dt>Step type</dt><dd>{STEP_TYPE_LABEL[detail.step_type]}</dd></div>
            {detail.wait_seconds_after > 0 && <div><dt>Wait after</dt><dd>{formatWait(detail.wait_seconds_after)}</dd></div>}
            {detail.notes && <div><dt>Notes</dt><dd>{detail.notes}</dd></div>}
          </dl>
        )}
      </BottomSheet>

      <BottomSheet
        open={journal}
        onClose={() => setJournal(false)}
        title="Today’s note"
        footer={<><Button variant="ghost" onClick={() => setJournal(false)}>Cancel</Button><Button variant="ink" onClick={saveJournal}>Save</Button></>}
      >
        <textarea className={s.journalArea} value={note} onChange={(e) => setNote(e.target.value)} placeholder="How did your skin feel? Anything new?" aria-label="Today’s note" rows={5} data-autofocus />
      </BottomSheet>

      {success && (
        <SuccessMoment
          data={success}
          onDone={() => {
            setSuccess(null);
            // B3.4: after morning completes, move on to the next regimen still to do.
            setSelected(defaultRegimenIndex(day.regimens.map((x) => ({ completed: !!x.completed_at }))));
          }}
        />
      )}
      {toast && (
        <ToastHost>
          <Toast>{toast}</Toast>
        </ToastHost>
      )}
    </div>
  );
}
