'use client';
import type { ReactNode } from 'react';
import s from './Pill.module.css';

/**
 * Toggle pill (regimen pills B3.3, Recurring/Date range, Day/Month, Mine/Shared).
 * Active = pink fill + semibold + optional icon; inactive = outline.
 */
export function Pill({ active, onClick, children, icon, controls, id }: { active: boolean; onClick: () => void; children: ReactNode; icon?: ReactNode; controls?: string; id?: string }) {
  return (
    <button type="button" role="tab" id={id} aria-selected={active} aria-controls={controls} tabIndex={active ? 0 : -1} className={`${s.pill} ${active ? s.active : ''}`} onClick={onClick}>
      {icon}
      <span className={s.text}>{children}</span>
    </button>
  );
}

/** Equal-width row of pills with arrow-key navigation (tablist pattern). */
export function PillGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={s.group}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
        const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        next?.focus();
        next?.click();
      }}
    >
      {children}
    </div>
  );
}

/** Static status label (Using, Active, Revoked, May 12–19). */
export function Badge({ children, tone = 'neutral', icon }: { children: ReactNode; tone?: 'neutral' | 'active' | 'info' | 'share' | 'muted'; icon?: ReactNode }) {
  return (
    <span className={`${s.badge} ${s[`b_${tone}`]}`}>
      {icon}
      {children}
    </span>
  );
}
