import type { ReactNode } from 'react';
import s from './EmptyState.module.css';

/** B9.2: 64px icon in soft circle → 16px medium headline → 12px subhead (max 240) → CTA. ~40% from top. */
export function EmptyState({ icon, title, body, action, children }: { icon: ReactNode; title: string; body?: string; action?: ReactNode; children?: ReactNode }) {
  return (
    <section className={s.wrap} aria-labelledby="empty-title">
      {children}
      <div className={s.content}>
        <div className={s.icon} aria-hidden>{icon}</div>
        <h2 id="empty-title" className={s.title}>{title}</h2>
        {body && <p className={s.body}>{body}</p>}
        {action && <div className={s.action}>{action}</div>}
      </div>
    </section>
  );
}
