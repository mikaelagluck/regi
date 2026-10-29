'use client';
import { IconChevronRight, IconDots, IconGripVertical } from '@tabler/icons-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '@/lib/client/hooks';
import { formatCountdown, timerState } from '@/lib/timer';
import { Checkbox } from './Checkbox';
import s from './StepRow.module.css';

export interface StepTimer {
  startedAt: string;
  waitSeconds: number;
  nextName?: string;
  /** Milliseconds to add to Date.now() so the client clock matches the server (and test time travel). */
  clockOffsetMs?: number;
}

interface Props {
  title: string;
  subtitle?: string;
  /** Today: checkbox. numbered: read-only position badge. plain: nothing. */
  lead?: 'check' | 'number' | 'none';
  index?: number;
  checked?: boolean;
  onToggle?: (next: boolean) => void;
  retroactive?: boolean;
  /** Current step (moodboard: pink border + number only). */
  active?: boolean;
  timer?: StepTimer | null;
  onTimerDone?: () => void;
  onOpen?: () => void;
  onMore?: () => void;
  trailing?: ReactNode;
  dragHandleProps?: Record<string, unknown>;
  testId?: string;
}

/** Fill + countdown computed from timer_started_at on every frame — never a ticking counter. */
function useTimer(timer: StepTimer | null | undefined, onDone?: () => void) {
  const reduced = useReducedMotion();
  const [now, setNow] = useState<number | null>(null);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    doneRef.current = false;
    if (!timer) return;
    let raf = 0;
    let iv: ReturnType<typeof setInterval> | undefined;
    const tick = () => {
      const t = Date.now() + (timer.clockOffsetMs ?? 0);
      setNow(t);
      if (!doneRef.current && timerState(timer.startedAt, timer.waitSeconds, t).done) {
        doneRef.current = true;
        onDoneRef.current?.();
      }
    };
    tick();
    if (reduced) iv = setInterval(tick, 1000);
    else {
      const loop = () => {
        tick();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      if (iv) clearInterval(iv);
    };
  }, [timer, reduced]);

  if (!timer || now === null) return null;
  return timerState(timer.startedAt, timer.waitSeconds, now);
}

export function StepRow({ title, subtitle, lead = 'check', index, checked = false, onToggle, retroactive, active, timer, onTimerDone, onOpen, onMore, trailing, dragHandleProps, testId }: Props) {
  const t = useTimer(timer, onTimerDone);
  const running = !!t && !t.done;
  const sub = running && timer ? `Wait ${formatCountdown(t.remainingSeconds)}${timer.nextName ? ` before ${timer.nextName}` : ''}` : subtitle;

  return (
    <div
      className={[s.row, checked && !running ? s.done : '', active && !checked ? s.active : '', running ? s.running : ''].join(' ')}
      data-testid={testId}
      data-state={checked ? 'done' : running ? 'waiting' : active ? 'active' : 'upcoming'}
    >
      {running && <div className={s.fill} style={{ transform: `scaleX(${t.fraction})` }} aria-hidden />}
      {dragHandleProps && (
        <button type="button" className={s.grip} aria-label={`Reorder ${title}`} {...dragHandleProps}>
          <IconGripVertical size={18} stroke={1.6} aria-hidden />
        </button>
      )}
      {lead === 'check' && (
        <Checkbox checked={checked} onChange={onToggle} retroactive={retroactive} label={`${title}${checked ? ', done' : ''}`} />
      )}
      {lead === 'number' && (
        <span className={s.num} aria-hidden>{(index ?? 0) + 1}</span>
      )}
      <button type="button" className={s.main} onClick={onOpen} disabled={!onOpen} aria-label={onOpen ? `Open ${title}` : undefined}>
        <span className={s.title}>
          {lead === 'number' && <span className="sr-only">Step {(index ?? 0) + 1}: </span>}
          {title}
        </span>
        {sub && <span className={s.subtitle} aria-live={running ? 'off' : undefined}>{sub}</span>}
      </button>
      {running && (
        <span className={s.countdown} role="timer" aria-label={`${formatCountdown(t.remainingSeconds)} left`}>
          {formatCountdown(t.remainingSeconds)}
        </span>
      )}
      {!running && trailing}
      {!running && !trailing && onOpen && <IconChevronRight className={s.chev} size={16} aria-hidden />}
      {onMore && (
        <button type="button" className={s.more} onClick={onMore} aria-label={`More options for ${title}`}>
          <IconDots size={18} aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Inline muted wait strip between steps ("Wait 5 min"). */
export function WaitStrip({ children }: { children: ReactNode }) {
  return <div className={s.wait}>{children}</div>;
}
