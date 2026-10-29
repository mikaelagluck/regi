'use client';
import type { ReactNode } from 'react';
import s from './Toast.module.css';

/** Ink toast with a pink action label; `share` tone is the yellow sharing confirmation. */
export function Toast({ children, icon, action, tone = 'ink' }: { children: ReactNode; icon?: ReactNode; action?: { label: string; onClick: () => void }; tone?: 'ink' | 'share' }) {
  return (
    <div className={`${s.toast} ${s[tone]}`} role="status" aria-live="polite">
      {icon && <span className={s.icon} aria-hidden>{icon}</span>}
      <span className={s.text}>{children}</span>
      {action && (
        <button type="button" className={s.action} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

export function ToastHost({ children }: { children: ReactNode }) {
  return <div className={s.host}>{children}</div>;
}
