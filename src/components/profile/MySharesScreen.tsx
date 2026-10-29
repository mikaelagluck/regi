'use client';
import { IconChevronRight, IconShare2 } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Chip, ChipGroup, EmptyState, TopBar } from '@/components/atoms';
import { compactNumber } from '@/lib/format';
import { formatMonthDay } from '@/lib/logicalDate';
import type { Share } from '@/lib/types';
import s from './MySharesScreen.module.css';

type Filter = 'all' | 'active' | 'revoked';
type Sort = 'recent' | 'views' | 'copies';
const TYPE_LABEL = { regimen: 'Regimen', user_product: 'Product', products_list: 'Shelf' } as const;

export function MySharesScreen({ shares }: { shares: Share[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const totals = shares.reduce((t, x) => ({ views: t.views + x.view_count, copies: t.copies + x.copy_count, clicks: t.clicks + x.link_click_count }), { views: 0, copies: 0, clicks: 0 });
  const active = shares.filter((x) => x.is_active).length;
  const list = shares
    .filter((x) => (filter === 'all' ? true : filter === 'active' ? x.is_active : !x.is_active))
    .sort((a, b) => (sort === 'views' ? b.view_count - a.view_count : sort === 'copies' ? b.copy_count - a.copy_count : b.created_at.localeCompare(a.created_at)));

  return (
    <>
      <TopBar back={{ href: '/profile' }} title="My Shares" />
      {shares.length === 0 ? (
        <EmptyState icon={<IconShare2 size={28} stroke={1.5} />} title="Nothing shared yet" body="Share a regimen or product from its page. Anyone with the link can view it." />
      ) : (
        <div className={s.body}>
          <section className={s.hero} aria-label="All-time totals">
            <span className="t-overline">All-time</span>
            <dl className={s.totals}>
              <div><dt>Views</dt><dd>{compactNumber(totals.views)}</dd></div>
              <div><dt>Copies</dt><dd>{compactNumber(totals.copies)}</dd></div>
              <div><dt>Link clicks</dt><dd>{compactNumber(totals.clicks)}</dd></div>
            </dl>
          </section>

          <div className={s.controls}>
            <ChipGroup label="Filter shares">
              <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>All {shares.length}</Chip>
              <Chip selected={filter === 'active'} onClick={() => setFilter('active')}>Active {active}</Chip>
              <Chip selected={filter === 'revoked'} onClick={() => setFilter('revoked')}>Revoked {shares.length - active}</Chip>
            </ChipGroup>
            <label>
              <span className="sr-only">Sort shares</span>
              <select className={s.sort} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="recent">Recent</option>
                <option value="views">Most viewed</option>
                <option value="copies">Most copied</option>
              </select>
            </label>
          </div>

          <ul className={s.list}>
            {list.map((x) => (
              <li key={x.id}>
                <Link href={`/profile/shares/${x.id}`} className={`${s.row} ${x.is_active ? '' : s.revoked}`} data-testid="share-row">
                  <span className={s.rowMain}>
                    <span className={s.rowHead}>
                      <span className={s.rowName}>{x.entity_name}</span>
                      {x.is_active ? <Badge tone="share">Active</Badge> : <Badge tone="muted">Revoked</Badge>}
                    </span>
                    <span className="t-caption">
                      {TYPE_LABEL[x.entity_type]} · {x.is_active || !x.revoked_at ? `shared ${formatMonthDay(x.created_at.slice(0, 10))}` : `revoked ${formatMonthDay(x.revoked_at.slice(0, 10))}`}
                    </span>
                    {x.is_active && (
                      <span className={s.stats}>
                        <span><strong>{compactNumber(x.view_count)}</strong> views</span>
                        <span><strong>{compactNumber(x.copy_count)}</strong> copies</span>
                        <span><strong>{compactNumber(x.link_click_count)}</strong> clicks</span>
                      </span>
                    )}
                  </span>
                  <IconChevronRight size={16} aria-hidden className={s.chev} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
