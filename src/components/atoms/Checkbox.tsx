'use client';
import { IconCheck, IconHistory } from '@tabler/icons-react';
import s from './Checkbox.module.css';

interface Props {
  checked: boolean;
  onChange?: (next: boolean) => void;
  /** Accessible name, e.g. "Mark Vitamin C Serum done". */
  label: string;
  /** B9.4: logged after the fact — subtle marker on the checkmark. */
  retroactive?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg';
}

/** Checked = pink fill + check glyph (shape cue, not colour alone). 44px hit area. */
export function Checkbox({ checked, onChange, label, retroactive, disabled, size = 'md' }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={retroactive && checked ? `${label} (logged later)` : label}
      disabled={disabled}
      className={`${s.hit} ${s[size]}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!checked);
      }}
    >
      <span className={`${s.box} ${checked ? s.checked : ''}`}>
        {checked && <IconCheck size={14} stroke={3} aria-hidden />}
      </span>
      {checked && retroactive && (
        <span className={s.retro} aria-hidden title="Logged later">
          <IconHistory size={9} stroke={2.4} />
        </span>
      )}
    </button>
  );
}
