'use client';
import { IconPencil, IconSearch } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { BottomSheet, Button, TextField } from '@/components/atoms';
import { ProductPicker } from '@/components/regimens/ProductPicker';
import type { PickerProduct } from '@/components/regimens/types';
import { api } from '@/lib/client/api';
import { addDays, formatShortDate, logicalDateRange, type LogicalDate } from '@/lib/logicalDate';
import type { DayStep, Product } from '@/lib/types';
import s from './EditScopeSheet.module.css';

export type Scope = 'today' | 'forward' | 'specific_days';
export interface EditRequest {
  action: 'skip' | 'swap';
  scope: Scope;
  days?: LogicalDate[];
  changes?: { user_product_id?: string | null; free_text_label?: string | null };
}

const OPTIONS: { value: Scope; label: string; hint: string }[] = [
  { value: 'today', label: 'Just today', hint: 'Regimen returns to normal tomorrow' },
  { value: 'forward', label: 'Today and going forward', hint: 'Past days unchanged' },
  { value: 'specific_days', label: 'Pick specific days', hint: 'Select dates from a calendar' },
];

/** [edit-scope] B5.6 — title verb changes per action; the three options are constant; past data never mutated. */
export function EditScopeSheet({ open, onClose, step, action, regimenName, date, onConfirm }: {
  open: boolean;
  onClose: () => void;
  step: DayStep | null;
  action: 'skip' | 'swap';
  regimenName: string;
  date: LogicalDate;
  onConfirm: (r: EditRequest) => Promise<void>;
}) {
  const [scope, setScope] = useState<Scope>('today');
  const [days, setDays] = useState<LogicalDate[]>([]);
  const [busy, setBusy] = useState(false);
  const [products, setProducts] = useState<PickerProduct[] | null>(null);
  const [picker, setPicker] = useState(false);
  const [swapTo, setSwapTo] = useState<{ id?: string; label: string } | null>(null);
  const [typing, setTyping] = useState('');
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setScope('today');
      setDays([date]);
      setSwapTo(null);
      setTyping('');
    }
  }

  useEffect(() => {
    if (!open || action !== 'swap' || products) return;
    api<{ items: Product[] }>('/api/products?all=1')
      .then((r) => setProducts(r.items.map((p) => ({ id: p.id, brand: p.brand, name: p.name, step_type: p.step_type, state: p.state, image_url: p.image_url }))))
      .catch(() => setProducts([]));
  }, [open, action, products]);

  if (!step) return null;
  const verb = action === 'skip' ? 'Skip' : 'Swap';
  const upcoming = logicalDateRange(date, addDays(date, 27));
  const swapReady = action === 'skip' || !!swapTo || !!typing.trim();
  const canConfirm = swapReady && (scope !== 'specific_days' || days.length > 0);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm({
        action,
        scope,
        days: scope === 'specific_days' ? days : undefined,
        changes: action === 'swap' ? (swapTo?.id ? { user_product_id: swapTo.id } : { free_text_label: (swapTo?.label ?? typing).trim() }) : undefined,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <BottomSheet
        open={open && !picker}
        onClose={onClose}
        title={`${verb} ${step.label}`}
        description={`This is part of your ${regimenName} regimen. Apply this change to:`}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="ink" onClick={confirm} disabled={!canConfirm} loading={busy}>Confirm</Button>
          </>
        }
      >
        {action === 'swap' && (
          <div className={s.swap}>
            <span className="t-overline">Swap to</span>
            {swapTo ? (
              <div className={s.swapPick}>
                <span>{swapTo.label}</span>
                <button type="button" className="t-link" onClick={() => setSwapTo(null)}>Change</button>
              </div>
            ) : (
              <>
                <div className={s.swapOptions}>
                  <Button variant="outline" size="sm" icon={<IconSearch size={15} aria-hidden />} onClick={() => setPicker(true)}>From my products</Button>
                </div>
                <TextField label="Or type a name" value={typing} onChange={(e) => setTyping(e.target.value)} placeholder="e.g. Travel-size moisturizer" lead={<IconPencil size={14} aria-hidden />} />
              </>
            )}
          </div>
        )}
        <div className={s.options} role="radiogroup" aria-label="Apply this change to">
          {OPTIONS.map((o) => (
            <button key={o.value} type="button" role="radio" aria-checked={scope === o.value} className={`${s.option} ${scope === o.value ? s.on : ''}`} onClick={() => setScope(o.value)}>
              <span className={s.dot} aria-hidden />
              <span className={s.optText}>
                <span className={s.optLabel}>{o.label}</span>
                <span className="t-caption">{o.hint}</span>
              </span>
            </button>
          ))}
        </div>
        {scope === 'specific_days' && (
          <div className={s.days} role="group" aria-label="Pick days">
            {upcoming.map((d) => {
              const on = days.includes(d);
              return (
                <button key={d} type="button" className={`${s.dayBtn} ${on ? s.dayOn : ''}`} aria-pressed={on} aria-label={formatShortDate(d)} onClick={() => setDays((x) => (on ? x.filter((y) => y !== d) : [...x, d]))}>
                  <span className={s.dow}>{formatShortDate(d).slice(0, 3)}</span>
                  <span>{Number(d.slice(8))}</span>
                </button>
              );
            })}
          </div>
        )}
      </BottomSheet>
      <ProductPicker
        open={picker}
        onClose={() => setPicker(false)}
        products={products ?? []}
        stepType={step.step_type}
        onPick={(p) => {
          setSwapTo({ id: p.id, label: `${p.brand} ${p.name}` });
          setPicker(false);
        }}
      />
    </>
  );
}
