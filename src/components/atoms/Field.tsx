'use client';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import { useId, type ComponentProps, type ReactNode } from 'react';
import s from './Field.module.css';

export function TextField({ label, hint, lead, optional, error, className, ...rest }: ComponentProps<"input"> & { label: string; hint?: ReactNode; lead?: ReactNode; optional?: boolean; error?: string }) {
  const id = useId();
  return (
    <div className={`${s.field} ${className ?? ''}`}>
      <label htmlFor={id} className={s.label}>
        {label}
        {optional && <span className={s.optional}> (optional)</span>}
      </label>
      <div className={`${s.control} ${error ? s.invalid : ''}`}>
        {lead && <span className={s.prefix}>{lead}</span>}
        <input id={id} className={s.input} aria-invalid={!!error} aria-describedby={hint || error ? `${id}-hint` : undefined} {...rest} />
      </div>
      {(error || hint) && (
        <div id={`${id}-hint`} className={s.hint}>
          {error ?? hint}
        </div>
      )}
    </div>
  );
}

export function TextArea({ label, hint, optional, className, ...rest }: ComponentProps<'textarea'> & { label: string; hint?: ReactNode; optional?: boolean }) {
  const id = useId();
  return (
    <div className={`${s.field} ${className ?? ''}`}>
      <label htmlFor={id} className={s.label}>
        {label}
        {optional && <span className={s.optional}> (optional)</span>}
      </label>
      <textarea id={id} className={`${s.control} ${s.textarea}`} aria-describedby={hint ? `${id}-hint` : undefined} {...rest} />
      {hint && <div id={`${id}-hint`} className={s.hint}>{hint}</div>}
    </div>
  );
}

export function SelectField({ label, children, optional, ...rest }: ComponentProps<'select'> & { label: string; optional?: boolean }) {
  const id = useId();
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
        {optional && <span className={s.optional}> (optional)</span>}
      </label>
      <select id={id} className={`${s.control} ${s.select}`} {...rest}>
        {children}
      </select>
    </div>
  );
}

/** On/off switch. On = pink track + knob moved right + "On" state for AT (role=switch). */
export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className={s.switchRow}>
      <div className={s.switchText}>
        <span id={id} className={s.switchLabel}>{label}</span>
        {description && <span id={`${id}-d`} className={s.switchDesc}>{description}</span>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-labelledby={id} aria-describedby={description ? `${id}-d` : undefined} className={`${s.switch} ${checked ? s.on : ''}`} onClick={() => onChange(!checked)}>
        <span className={s.knob} aria-hidden />
      </button>
    </div>
  );
}

/** Star rating. Filled vs outline stars (shape cue). */
export function Stars({ value, onChange, size = 16, label = 'Rating' }: { value: number | null; onChange?: (v: number) => void; size?: number; label?: string }) {
  const v = value ?? 0;
  if (!onChange) {
    return (
      <span className={s.stars} role="img" aria-label={value ? `${v} out of 5 stars` : 'Not rated'}>
        {[1, 2, 3, 4, 5].map((i) => (i <= v ? <IconStarFilled key={i} size={size} className={s.starOn} aria-hidden /> : <IconStar key={i} size={size} className={s.starOff} aria-hidden />))}
      </span>
    );
  }
  return (
    <div className={s.stars} role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={v === i} aria-label={`${i} star${i > 1 ? 's' : ''}`} className={s.starBtn} onClick={() => onChange(v === i ? 0 : i)}>
          {i <= v ? <IconStarFilled size={size} className={s.starOn} aria-hidden /> : <IconStar size={size} className={s.starOff} aria-hidden />}
        </button>
      ))}
    </div>
  );
}

export function Section({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${s.section} ${className ?? ''}`}>
      {(title || action) && (
        <div className={s.sectionHead}>
          {title && <h2 className="t-overline">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Tappable settings/property row: label on the left, value + chevron on the right. */
export function PropertyRow({ label, value, onClick, href, children }: { label: string; value?: ReactNode; onClick?: () => void; href?: string; children?: ReactNode }) {
  const inner = (
    <>
      <span className={s.propLabel}>{label}</span>
      <span className={s.propValue}>{value}</span>
      {children}
    </>
  );
  if (href) return <a href={href} className={s.prop}>{inner}</a>;
  return (
    <button type="button" className={s.prop} onClick={onClick} disabled={!onClick}>
      {inner}
    </button>
  );
}
