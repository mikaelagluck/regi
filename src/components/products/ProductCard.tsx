import Link from 'next/link';
import { Stars, StepTypeIcon } from '@/components/atoms';
import { ordinal } from '@/lib/format';
import type { Product } from '@/lib/types';
import s from './ProductCard.module.css';

/** B4.3 card: square image (or category icon), brand overline, 2-line name, stars, repurchase badge. */
export function ProductCard({ p, showState }: { p: Product; showState?: boolean }) {
  return (
    <Link href={`/products/${p.id}`} className={s.card} data-testid="product-card">
      <div className={s.media}>
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image_url} alt="" className={s.img} loading="lazy" />
        ) : (
          <span className={s.placeholder} aria-hidden>
            <StepTypeIcon type={p.step_type} size={28} />
          </span>
        )}
        {p.repurchase_count > 0 && (
          <span className={s.badge} aria-label={`${ordinal(p.repurchase_count + 1)} bottle`}>
            {ordinal(p.repurchase_count + 1)}
          </span>
        )}
      </div>
      <div className={s.body}>
        <span className={s.brand}>{p.brand}</span>
        <span className={s.name}>{p.name}</span>
        <div className={s.meta}>
          <Stars value={p.star_rating} size={12} />
          {showState && <span className={s.state}>{p.state}</span>}
        </div>
      </div>
    </Link>
  );
}
