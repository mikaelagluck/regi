'use client';
import { IconChevronLeft } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import s from './TopBar.module.css';

interface Props {
  title?: ReactNode;
  /** Large Spectral title on the left (tab roots: "Products", "Regimens"). */
  large?: boolean;
  back?: { href?: string; label?: string } | true;
  /** Text action on the left (e.g. "Cancel"). */
  leading?: ReactNode;
  trailing?: ReactNode;
  center?: ReactNode;
}

export function TopBar({ title, large, back, leading, trailing, center }: Props) {
  const router = useRouter();
  const backCfg = back === true ? {} : back;
  return (
    <header className={`${s.bar} ${large ? s.large : ''}`}>
      <div className={s.side}>
        {backCfg &&
          (backCfg.href ? (
            <Link href={backCfg.href} className={s.back}>
              <IconChevronLeft size={20} aria-hidden />
              <span>{backCfg.label ?? 'Back'}</span>
            </Link>
          ) : (
            <button type="button" className={s.back} onClick={() => router.back()}>
              <IconChevronLeft size={20} aria-hidden />
              <span>{backCfg.label ?? 'Back'}</span>
            </button>
          ))}
        {leading}
        {large && title && <h1 className={`t-title ${s.largeTitle}`}>{title}</h1>}
      </div>
      {!large && (center ?? (title && <h1 className={s.title}>{title}</h1>))}
      <div className={`${s.side} ${s.right}`}>{trailing}</div>
    </header>
  );
}

export function TextAction({ children, ...rest }: React.ComponentProps<'button'>) {
  return (
    <button type="button" className={s.textAction} {...rest}>
      {children}
    </button>
  );
}

export function IconAction({ label, children, ...rest }: React.ComponentProps<'button'> & { label: string }) {
  return (
    <button type="button" className={s.iconAction} aria-label={label} {...rest}>
      {children}
    </button>
  );
}

export function IconActionLink({ label, children, href }: { label: string; children: ReactNode; href: string }) {
  return (
    <Link href={href} className={s.iconAction} aria-label={label}>
      {children}
    </Link>
  );
}
