'use client';
import { IconRefresh } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Stars, TextArea } from '@/components/atoms';
import { api } from '@/lib/client/api';
import { ordinal } from '@/lib/format';
import type { Product } from '@/lib/types';
import s from './FinishForm.module.css';

type Next = 'repurchasing' | 'trying_else' | 'done';
const OPTIONS: { value: Next; label: string }[] = [
  { value: 'repurchasing', label: 'Repurchasing' },
  { value: 'trying_else', label: 'Trying something else' },
  { value: 'done', label: 'Just done' },
];

/** Reflection + intent on finishing a product. Writes user_product_history (C2.5). */
export function FinishForm({ product, usedLine }: { product: Product; usedLine: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(product.star_rating ?? 0);
  const [notes, setNotes] = useState('');
  const [next, setNext] = useState<Next | null>(null);
  const [busy, setBusy] = useState(false);

  async function finish(skip: boolean) {
    setBusy(true);
    await api(`/api/products/${product.id}/finish`, {
      body: skip ? {} : { star_rating: rating || null, notes: notes.trim() || null, next },
    });
    router.replace(`/products/${product.id}`);
    router.refresh();
  }

  return (
    <div className={s.screen}>
      <header className={s.head}>
        <span className="t-overline">Finished it!</span>
        <h1 className={s.name}>{product.brand} {product.name}</h1>
        <p className="t-caption">{usedLine}</p>
        {product.repurchase_count > 0 && <Badge icon={<IconRefresh size={12} aria-hidden />}>Your {ordinal(product.repurchase_count + 1)} jar</Badge>}
      </header>

      <section className={s.section}>
        <h2 className={s.label} id="rate">Rate it</h2>
        <Stars value={rating} onChange={setRating} size={32} label="Rate it" />
      </section>

      <section className={s.section}>
        <TextArea label="Final thoughts" optional value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Best exfoliant I've tried." />
      </section>

      <fieldset className={s.section}>
        <legend className={s.label}>What&apos;s next?</legend>
        <div className={s.radios} role="radiogroup">
          {OPTIONS.map((o) => (
            <button key={o.value} type="button" role="radio" aria-checked={next === o.value} className={`${s.radio} ${next === o.value ? s.on : ''}`} onClick={() => setNext(o.value)}>
              <span className={s.dot} aria-hidden />
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className={s.footer}>
        <Button variant="ghost" onClick={() => finish(true)} disabled={busy}>Skip</Button>
        <Button variant="ink" onClick={() => finish(false)} loading={busy}>Save</Button>
      </div>
    </div>
  );
}
