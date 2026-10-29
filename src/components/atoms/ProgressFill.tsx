import s from './ProgressFill.module.css';

/** Slim progress bar. Pink only when it represents the active regimen. */
export function ProgressFill({ value, label, tone = 'active' }: { value: number; label: string; tone?: 'active' | 'neutral' }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={s.track} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className={`${s.fill} ${s[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
