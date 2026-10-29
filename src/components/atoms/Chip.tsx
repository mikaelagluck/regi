'use client';
import { IconCheck, IconX } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import s from './Chip.module.css';

interface Props {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  /** Inline active-filter chip: shows × and calls onRemove. */
  onRemove?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
}

/** Selection chip. Selected = ink fill + check (weight/shape cue; colour stays neutral). */
export function Chip({ children, selected, onClick, onRemove, icon, disabled }: Props) {
  if (onRemove) {
    return (
      <span className={`${s.chip} ${s.selected} ${s.removable}`}>
        {children}
        <button type="button" className={s.remove} onClick={onRemove} aria-label={`Remove filter ${typeof children === 'string' ? children : ''}`.trim()}>
          <IconX size={12} stroke={2.4} aria-hidden />
        </button>
      </span>
    );
  }
  return (
    <button type="button" className={`${s.chip} ${selected ? s.selected : ''}`} aria-pressed={selected} onClick={onClick} disabled={disabled}>
      {icon}
      {children}
      {selected && <IconCheck size={13} stroke={2.6} aria-hidden />}
    </button>
  );
}

export function ChipGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div role="group" aria-label={label} className={s.group}>
      {children}
    </div>
  );
}
