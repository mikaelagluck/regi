'use client';
import { IconAdjustmentsHorizontal, IconArrowRight, IconBottle, IconPlus } from '@tabler/icons-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, ButtonLink, Chip, EmptyState, IconActionLink, Pill, PillGroup, TopBar } from '@/components/atoms';
import { filterProducts, filtersToQuery, hasActiveFilters, SORT_LABEL, STATE_LABEL, type ProductFilters, type ProductSort } from '@/lib/productFilters';
import { STEP_TYPE_LABEL, type StepType } from '@/lib/stepTypes';
import type { Category, Product, ProductState } from '@/lib/types';
import { FilterSheet } from './FilterSheet';
import { ProductCard } from './ProductCard';
import s from './ProductsScreen.module.css';

interface Props {
  products: Product[];
  categories: Category[];
  regimens: { id: string; name: string }[];
  filters: ProductFilters;
}

/** [products-01] / [empty-products] — B4.1–B4.5. Filters live in the URL so the tab remembers them. */
export function ProductsScreen({ products, categories, regimens, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [sheet, setSheet] = useState(false);
  const { items, counts, acrossAllStates, inState } = filterProducts(products, filters);
  const set = (f: ProductFilters) => router.replace(`${pathname}${filtersToQuery(f)}`, { scroll: false });
  const active = hasActiveFilters(filters);
  const filterCount = filters.stepTypes.length + filters.categoryIds.length + filters.brands.length + filters.regimenIds.length + (filters.minRating ? 1 : 0);

  const chips: { label: string; remove: () => void }[] = [
    ...filters.stepTypes.map((t) => ({ label: STEP_TYPE_LABEL[t as StepType] ?? t, remove: () => set({ ...filters, stepTypes: filters.stepTypes.filter((x) => x !== t) }) })),
    ...filters.categoryIds.map((id) => ({ label: categories.find((c) => c.id === id)?.name ?? 'Category', remove: () => set({ ...filters, categoryIds: filters.categoryIds.filter((x) => x !== id) }) })),
    ...filters.brands.map((b) => ({ label: b, remove: () => set({ ...filters, brands: filters.brands.filter((x) => x !== b) }) })),
    ...filters.regimenIds.map((id) => ({ label: regimens.find((r) => r.id === id)?.name ?? 'Regimen', remove: () => set({ ...filters, regimenIds: filters.regimenIds.filter((x) => x !== id) }) })),
    ...(filters.minRating ? [{ label: filters.minRating === 5 ? '5 stars' : `${filters.minRating}+ stars`, remove: () => set({ ...filters, minRating: 0 }) }] : []),
  ];

  const header = (
    <TopBar large title="Products" trailing={<IconActionLink label="Add product" href={`/products/new${filters.state === 'wishlist' ? '?state=wishlist' : ''}`}><IconPlus size={24} aria-hidden /></IconActionLink>} />
  );

  const tabs = (
    <div className={s.tabs}>
      <PillGroup label="Product state">
        {(['using', 'empty', 'wishlist'] as ProductState[]).map((st) => (
          <Pill key={st} active={!filters.allStates && filters.state === st} onClick={() => set({ ...filters, state: st, allStates: false })}>
            {STATE_LABEL[st]} {counts[st]}
          </Pill>
        ))}
      </PillGroup>
    </div>
  );

  if (products.length === 0) {
    return (
      <>
        {header}
        {tabs}
        <EmptyState
          icon={<IconBottle size={28} stroke={1.5} />}
          title="Add your first product"
          body="Anything you use — cleansers, serums, SPF, masks, tools."
          action={<ButtonLink href="/products/new" variant="primary">Add product</ButtonLink>}
        />
      </>
    );
  }

  const brandWord = filters.brands.length === 1 ? `${filters.brands[0]} ` : '';

  return (
    <>
      {header}
      {tabs}
      <div className={s.filterRow}>
        <button type="button" className={`${s.filterBtn} ${filterCount ? s.filterOn : ''}`} onClick={() => setSheet(true)} aria-haspopup="dialog">
          <IconAdjustmentsHorizontal size={16} aria-hidden />
          Filter{filterCount ? ` · ${filterCount}` : ''}
        </button>
        <div className={s.chips}>
          {chips.map((c) => (
            <Chip key={c.label} onRemove={c.remove}>{c.label}</Chip>
          ))}
        </div>
        <label className={s.sort}>
          <span className="sr-only">Sort by</span>
          <select value={filters.sort} onChange={(e) => set({ ...filters, sort: e.target.value as ProductSort })} className={s.sortSelect}>
            {(Object.keys(SORT_LABEL) as ProductSort[]).map((k) => (
              <option key={k} value={k}>{SORT_LABEL[k]}</option>
            ))}
          </select>
        </label>
      </div>

      {active && !filters.allStates && acrossAllStates > inState && (
        <button type="button" className={s.hint} onClick={() => set({ ...filters, allStates: true })}>
          Showing {inState} {brandWord}product{inState === 1 ? '' : 's'} in {STATE_LABEL[filters.state]}. <span className={s.hintLink}>See all {acrossAllStates} across all states <IconArrowRight size={14} aria-hidden /></span>
        </button>
      )}
      {filters.allStates && (
        <button type="button" className={s.hint} onClick={() => set({ ...filters, allStates: false })}>
          Showing {acrossAllStates} across all states. <span className={s.hintLink}>Back to {STATE_LABEL[filters.state]}</span>
        </button>
      )}

      {items.length ? (
        <ul className={s.grid} aria-label={`${filters.allStates ? 'All' : STATE_LABEL[filters.state]} products`}>
          {items.map((p) => (
            <li key={p.id}>
              <ProductCard p={p} showState={filters.allStates} />
            </li>
          ))}
        </ul>
      ) : (
        <div className={s.none}>
          <p className="t-secondary">{active ? 'No products match these filters.' : `Nothing in ${STATE_LABEL[filters.state]} yet.`}</p>
          {active && <Button variant="outline" size="sm" onClick={() => set({ ...filters, stepTypes: [], categoryIds: [], brands: [], regimenIds: [], minRating: 0 })}>Clear filters</Button>}
        </div>
      )}

      <FilterSheet
        open={sheet}
        onClose={() => setSheet(false)}
        value={filters}
        onApply={(f) => {
          set(f);
          setSheet(false);
        }}
        products={products}
        categories={categories}
        regimens={regimens}
      />
    </>
  );
}
