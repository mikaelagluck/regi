import type { ComponentProps } from 'react';
import s from './Card.module.css';

export function Card({ className, tone = 'plain', padded = true, ...rest }: ComponentProps<'div'> & { tone?: 'plain' | 'filled' | 'share'; padded?: boolean }) {
  return <div className={[s.card, s[tone], padded && s.padded, className].filter(Boolean).join(' ')} {...rest} />;
}
