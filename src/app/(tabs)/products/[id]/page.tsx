import { IconChevronRight, IconExternalLink, IconLink, IconShare2, IconSun } from '@tabler/icons-react';
import Link from 'next/link';
import { Badge, ButtonLink, Stars, StepTypeIcon, TopBar } from '@/components/atoms';
import { TOD_ICON } from '@/components/atoms/todIcons';
import { NotesEditor } from '@/components/products/NotesEditor';
import { ProductStateActions } from '@/components/products/ProductStateActions';
import { requireProfile } from '@/lib/auth/session';
import { asUser } from '@/lib/db';
import { hostname, ordinal } from '@/lib/format';
import { daysBetween, formatMonthDay } from '@/lib/logicalDate';
import { STATE_LABEL } from '@/lib/productFilters';
import { dayCtx } from '@/lib/server/context';
import { orNotFound } from '@/lib/server/pages';
import { getProduct, productHistory, productRegimens } from '@/lib/server/products';
import { STEP_TYPE_LABEL } from '@/lib/stepTypes';
import s from './detail.module.css';

/** [product-detail] B4.7 */
export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireProfile();
  const { id } = await params;
  const ctx = await dayCtx(profile);
  const { p, regimens, history } = await orNotFound(
    asUser(profile.id, async (tx) => ({ p: await getProduct(tx, id), regimens: await productRegimens(tx, id), history: await productHistory(tx, id) })),
  );
  const daysIn = p.started_on ? Math.max(0, daysBetween(p.started_on, p.finished_on ?? ctx.today)) : null;
  const host = hostname(p.affiliate_url);

  return (
    <>
      <TopBar back={{ href: '/products' }} trailing={<Link href={`/products/${p.id}/edit`} className={s.edit}>Edit</Link>} />
      <div className={s.page}>
        <section className={s.hero}>
          <div className={s.media}>
            {p.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt="" className={s.img} />
            ) : (
              <StepTypeIcon type={p.step_type} size={30} />
            )}
          </div>
          <div className={s.heroText}>
            <span className="t-overline">{p.brand}</span>
            <h1 className={s.name}>{p.name}</h1>
            <span className={s.cat}>{p.category_name} · {STEP_TYPE_LABEL[p.step_type]}</span>
            <div className={s.heroMeta}>
              <Badge tone={p.state === 'using' ? 'active' : 'neutral'}>{STATE_LABEL[p.state]}</Badge>
              <Stars value={p.star_rating} size={14} />
            </div>
          </div>
        </section>

        <dl className={s.strip}>
          <div><dt>Started</dt><dd>{p.started_on ? formatMonthDay(p.started_on) : '—'}</dd></div>
          <div><dt>Days in</dt><dd>{daysIn ?? '—'}</dd></div>
          <div><dt>Bottle</dt><dd>{ordinal(p.repurchase_count + 1)}</dd></div>
        </dl>

        <NotesEditor productId={p.id} initial={p.notes} />

        <section className={s.section}>
          <h2 className="t-overline">In regimens</h2>
          {regimens.length ? (
            <ul className={s.rows}>
              {regimens.map((r) => {
                const Icon = TOD_ICON[r.time_of_day as keyof typeof TOD_ICON] ?? IconSun;
                return (
                  <li key={r.id}>
                    <Link href={`/regimens/${r.id}`} className={s.row}>
                      <Icon size={16} aria-hidden />
                      <span className={s.rowLabel}>{r.name}</span>
                      <IconChevronRight size={16} aria-hidden className={s.chev} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="t-caption">Not in any regimen yet.</p>
          )}
        </section>

        {host && (
          <a href={p.affiliate_url!} target="_blank" rel="noopener noreferrer nofollow" className={s.buy}>
            <IconLink size={18} aria-hidden />
            <span className={s.buyText}>
              <span className={s.rowLabel}>Where I buy it</span>
              <span className="t-caption">{host}</span>
            </span>
            <IconExternalLink size={16} aria-hidden className={s.chev} />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}

        {history.length > 0 && (
          <section className={s.section}>
            <h2 className="t-overline">Past bottles</h2>
            <ul className={s.rows}>
              {history.map((h, i) => (
                <li key={h.id} className={s.history}>
                  <span className={s.rowLabel}>{ordinal(history.length - i)} · {h.started_on ? formatMonthDay(h.started_on) : '?'} – {h.finished_on ? formatMonthDay(h.finished_on) : '?'}</span>
                  {h.star_rating_at_completion ? <Stars value={h.star_rating_at_completion} size={12} /> : null}
                  {h.notes_at_completion && <p className={s.histNote}>“{h.notes_at_completion}”</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className={s.actions}>
          <ButtonLink href={`/share/new?type=user_product&id=${p.id}`} variant="share" icon={<IconShare2 size={16} aria-hidden />}>
            Share
          </ButtonLink>
          <ProductStateActions id={p.id} state={p.state} />
        </div>
      </div>
    </>
  );
}
