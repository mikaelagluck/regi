import s from './Dot.module.css';

export type DotState = 'complete' | 'partial' | 'skipped' | 'none';

const LABEL: Record<DotState, string> = { complete: 'complete', partial: 'partial', skipped: 'skipped', none: 'no data' };

/** B6.3 — shape distinction, not colour alone: filled · bottom-half filled · slashed · outline. */
export function Dot({ state, size = 7, label }: { state: DotState; size?: number; label?: string }) {
  return (
    <span className={`${s.dot} ${s[state]}`} style={{ width: size, height: size }} role="img" aria-label={label ?? LABEL[state]} />
  );
}

export const DOT_LABEL = LABEL;
