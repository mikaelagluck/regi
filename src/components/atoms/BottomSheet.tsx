'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import s from './BottomSheet.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Visually hide the title (still the dialog's accessible name). */
  hideTitle?: boolean;
  description?: ReactNode;
  headerAction?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible bottom sheet (B9.1): 4×36 drag handle, dimmed overlay, swipe-down to dismiss,
 * Esc to close, focus trapped inside and restored on close, background made inert.
 */
export function BottomSheet({ open, onClose, title, hideTitle, description, headerAction, children, footer }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const column = document.querySelector<HTMLElement>('.app-column');
    column?.setAttribute('inert', '');
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
      if (e.key === 'Tab' && node) {
        const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!items.length) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      column?.removeAttribute('inert');
      previous?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className={s.layer}>
      <div className={s.scrim} onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={s.sheet}
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
      >
        <div
          className={s.grab}
          onPointerDown={(e) => {
            start.current = e.clientY;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current));
          }}
          onPointerUp={() => {
            if (drag > 80) onClose();
            start.current = null;
            setDrag(0);
          }}
          onPointerCancel={() => {
            start.current = null;
            setDrag(0);
          }}
        >
          <span className={s.handle} aria-hidden />
          <div className={`${s.header} ${hideTitle ? s.headerHidden : ''}`}>
            <h2 id={titleId} className={hideTitle ? 'sr-only' : s.title}>{title}</h2>
            {headerAction}
          </div>
        </div>
        {description && <p id={descId} className={s.description}>{description}</p>}
        <div className={s.body}>{children}</div>
        {footer && <div className={s.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
