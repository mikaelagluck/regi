import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import s from './Button.module.css';

/**
 * primary  — pink: the screen's main / time-sensitive action (CLAUDE.md conflict #2)
 * ink      — ink: confirm in neutral contexts (moodboard "primary")
 * outline  — secondary, non-urgent
 * ghost    — low-stakes (Skip, Cancel)
 * share    — yellow: sharing only
 * destructive — ink 500 text, no colour (CLAUDE.md conflict #5); always behind a confirmation
 */
export type ButtonVariant = 'primary' | 'ink' | 'outline' | 'ghost' | 'share' | 'destructive';

interface Common {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  block?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

function cls({ variant = 'primary', size = 'md', block }: Common, extra?: string) {
  return [s.btn, s[variant], s[size], block && s.block, extra].filter(Boolean).join(' ');
}

export function Button({ variant, size, block, icon, children, className, loading, ...rest }: Common & ComponentProps<'button'> & { loading?: boolean }) {
  return (
    <button type="button" className={cls({ variant, size, block }, className)} aria-busy={loading || undefined} disabled={rest.disabled || loading} {...rest}>
      {icon}
      {children && <span>{children}</span>}
    </button>
  );
}

export function ButtonLink({ variant, size, block, icon, children, className, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={cls({ variant, size, block }, className)} {...rest}>
      {icon}
      {children && <span>{children}</span>}
    </Link>
  );
}
