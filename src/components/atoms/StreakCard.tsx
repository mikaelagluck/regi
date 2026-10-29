import { IconCircleCheck, IconFlame } from '@tabler/icons-react';
import s from './StreakCard.module.css';

/**
 * Small streak card (B3.2). Flame + number in ink with a blue icon tint (CLAUDE.md conflict #3 —
 * no amber in the palette). `delta` shows the "+1 today" ticker on the success screen.
 */
export function StreakCard({ kind, value, label, delta, size = 'sm' }: { kind: 'streak' | 'completed'; value: number; label: string; delta?: number; size?: 'sm' | 'lg' }) {
  const Icon = kind === 'streak' ? IconFlame : IconCircleCheck;
  return (
    <div className={`${s.card} ${s[size]}`}>
      <span className={`${s.icon} ${kind === 'streak' ? s.flame : ''}`} aria-hidden>
        <Icon size={size === 'lg' ? 22 : 18} stroke={1.8} />
      </span>
      <div className={s.text}>
        <span className={s.value} data-testid={kind === 'streak' ? 'streak-value' : 'completed-value'}>{value.toLocaleString()}</span>
        <span className={s.label}>{label}</span>
        {delta ? <span className={s.delta}>+{delta} today</span> : null}
      </div>
    </div>
  );
}
