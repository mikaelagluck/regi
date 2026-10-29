'use client';
import { IconSearch } from '@tabler/icons-react';
import { useState } from 'react';
import { BottomSheet, StepTypeIcon } from '@/components/atoms';
import type { StepType } from '@/lib/stepTypes';
import type { PickerProduct } from './types';
import s from './ProductPicker.module.css';

/** "From my products" — search + select (B5.4). Matching step type first, using before wishlist. */
export function ProductPicker({ open, onClose, products, stepType, onPick }: { open: boolean; onClose: () => void; products: PickerProduct[]; stepType: StepType; onPick: (p: PickerProduct) => void }) {
  const [q, setQ] = useState('');
  const rank = (p: PickerProduct) => (p.step_type === stepType ? 0 : 3) + (p.state === 'using' ? 0 : p.state === 'wishlist' ? 1 : 2);
  const list = products
    .filter((p) => `${p.brand} ${p.name}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  return (
    <BottomSheet open={open} onClose={onClose} title="From my products">
      <div className={s.wrap}>
        <label className={s.search}>
          <IconSearch size={16} aria-hidden />
          <input className={s.input} placeholder="Search your shelf" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" data-autofocus />
        </label>
        <ul className={s.list}>
          {list.map((p) => (
            <li key={p.id}>
              <button type="button" className={s.item} onClick={() => onPick(p)}>
                <span className={s.thumb}>
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" />
                  ) : (
                    <StepTypeIcon type={p.step_type} size={18} />
                  )}
                </span>
                <span className={s.text}>
                  <span className="t-overline">{p.brand}</span>
                  <span className={s.name}>{p.name}</span>
                </span>
                {p.state !== 'using' && <span className="t-caption">{p.state}</span>}
              </button>
            </li>
          ))}
          {!list.length && <li className="t-secondary">{products.length ? 'No matches.' : 'Your shelf is empty — use “Don’t have it” to type a name.'}</li>}
        </ul>
      </div>
    </BottomSheet>
  );
}
