'use client';
import { IconCheck } from '@tabler/icons-react';
import { useEffect } from 'react';
import { StreakCard } from '@/components/atoms';
import { TIME_OF_DAY_LABEL, type TimeOfDay } from '@/lib/schedule';
import s from './SuccessMoment.module.css';

export interface SuccessData {
  time_of_day: TimeOfDay;
  regimen_name: string;
  day_number: number;
  streak_before: number;
  streak_after: number;
  lifetime_before: number;
  lifetime_after: number;
}

const PARTICLES = Array.from({ length: 18 }, (_, i) => i);

/** [success-moment] B3.8 — overlay ~150ms, check bounce ~300ms, confetti ~1.5s, auto-dismiss 1.5s or tap. */
export function SuccessMoment({ data, onDone }: { data: SuccessData; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500 + 400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-label={`${TIME_OF_DAY_LABEL[data.time_of_day]} complete, day ${data.day_number}`} onClick={onDone} data-testid="success-moment">
      <div className={s.confetti} aria-hidden>
        {PARTICLES.map((i) => (
          <span key={i} className={s.p} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 6) * 90}ms`, ['--drift' as string]: `${((i * 37) % 60) - 30}px` }} />
        ))}
      </div>
      <div className={s.content}>
        <span className={s.check} aria-hidden><IconCheck size={56} stroke={2.6} /></span>
        <p className={s.label}>{TIME_OF_DAY_LABEL[data.time_of_day]} complete</p>
        <p className={s.day}>Day {data.day_number}.</p>
        <div className={s.cards}>
          <StreakCard kind="streak" value={data.streak_after} label="Perfect day streak" delta={data.streak_after - data.streak_before || undefined} size="lg" />
          <StreakCard kind="completed" value={data.lifetime_after} label="Regimens completed" delta={data.lifetime_after - data.lifetime_before || undefined} size="lg" />
        </div>
        <button type="button" className={s.dismiss} onClick={onDone}>Tap to dismiss</button>
      </div>
    </div>
  );
}
