'use client';
import { IconChevronLeft, IconChevronRight, IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { BottomSheet, Button, Checkbox, Chip, ChipGroup, Switch } from '@/components/atoms';
import { DEFAULT_FILTERS, filterProducts, type ProductFilters } from '@/lib/productFilters';
import { STEP_TYPE_LABEL, STEP_TYPES } from '@/lib/stepTypes';
import type { Category, Product } from '@/lib/types';
import s from './FilterSheet.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  value: ProductFilters;
  onApply: (f: ProductFilters) => void;
  products: Product[];
  categories: Category[];
  regimens: { id: string; name: string }[];
}

type View = 'main' | 'category' | 'brand' | 'regimen';

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** [products-filter] B4.4 — multi-dimension filter with drilldowns and a live result count. */
export function FilterSheet({ open, onClose, value, onApply, products, categories, regimens }: Props) {
  const [draft, setDraft] = useState(value);
  const [view, setView] = useState<View>('main');
  const [query, setQuery] = useState('');
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setDraft(value);
      setView('main');
    }
  }

  const brands = useMemo(() => [...new Set(products.map((p) => p.brand))].sort((a, b) => a.localeCompare(b)), [products]);
  const result = filterProducts(products, draft);
  const count = draft.allStates ? result.acrossAllStates : result.inState;
  const summary = (ids: string[], all: string, name: (id: string) => string) => (ids.length === 0 ? all : ids.length === 1 ? name(ids[0]) : `${ids.length} selected`);

  const title = { main: 'Filter', category: 'Category', brand: 'Brand', regimen: 'In regimen' }[view];

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        view === 'main' ? (
          title
        ) : (
          <button type="button" className={s.back} onClick={() => { setView('main'); setQuery(''); }}>
            <IconChevronLeft size={18} aria-hidden /> {title}
          </button>
        )
      }
      headerAction={
        view === 'main' ? (
          <button type="button" className={s.reset} onClick={() => setDraft({ ...DEFAULT_FILTERS, state: draft.state, sort: draft.sort })}>
            Reset
          </button>
        ) : undefined
      }
      footer={
        <Button variant="ink" block onClick={() => onApply(draft)}>
          Show {count} result{count === 1 ? '' : 's'}
        </Button>
      }
    >
      {view === 'main' && (
        <div className={s.stack}>
          <fieldset className={s.group}>
            <legend className="t-overline">Step type</legend>
            <ChipGroup label="Step type">
              {STEP_TYPES.map((t) => (
                <Chip key={t} selected={draft.stepTypes.includes(t)} onClick={() => setDraft({ ...draft, stepTypes: toggle(draft.stepTypes, t) })}>
                  {STEP_TYPE_LABEL[t]}
                </Chip>
              ))}
            </ChipGroup>
          </fieldset>

          <div className={s.drills}>
            <Drill label="Category" value={summary(draft.categoryIds, 'All categories', (id) => categories.find((c) => c.id === id)?.name ?? '')} onClick={() => setView('category')} />
            <Drill label="Brand" value={summary(draft.brands, 'All brands', (b) => b)} onClick={() => setView('brand')} />
            <Drill label="In regimen" value={summary(draft.regimenIds, 'Any regimen', (id) => regimens.find((r) => r.id === id)?.name ?? '')} onClick={() => setView('regimen')} />
          </div>

          <fieldset className={s.group}>
            <legend className="t-overline">Rating</legend>
            <ChipGroup label="Minimum rating">
              {[0, 3, 4, 5].map((r) => (
                <Chip key={r} selected={draft.minRating === r} onClick={() => setDraft({ ...draft, minRating: r })}>
                  {r === 0 ? 'Any' : r === 5 ? '5' : `${r}+`}
                </Chip>
              ))}
            </ChipGroup>
          </fieldset>

          <Switch checked={draft.allStates} onChange={(v) => setDraft({ ...draft, allStates: v })} label="Show across all states" />
        </div>
      )}

      {view === 'category' && (
        <ul className={s.list}>
          {STEP_TYPES.map((t) => {
            const cats = categories.filter((c) => c.step_type === t);
            return (
              <li key={t}>
                <div className={`t-overline ${s.listHead}`}>{STEP_TYPE_LABEL[t]}</div>
                {cats.map((c) => (
                  <CheckRow key={c.id} label={c.name} checked={draft.categoryIds.includes(c.id)} onChange={() => setDraft({ ...draft, categoryIds: toggle(draft.categoryIds, c.id) })} />
                ))}
              </li>
            );
          })}
        </ul>
      )}

      {view === 'brand' && (
        <div className={s.stack}>
          <label className={s.search}>
            <IconSearch size={16} aria-hidden />
            <input className={s.searchInput} placeholder="Search your brands" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search brands" data-autofocus />
          </label>
          <ul className={s.list}>
            {brands.filter((b) => b.toLowerCase().includes(query.toLowerCase())).map((b) => (
              <li key={b}>
                <CheckRow label={b} checked={draft.brands.includes(b)} onChange={() => setDraft({ ...draft, brands: toggle(draft.brands, b) })} />
              </li>
            ))}
            {brands.length === 0 && <li className="t-caption">No brands yet.</li>}
          </ul>
        </div>
      )}

      {view === 'regimen' && (
        <ul className={s.list}>
          {regimens.map((r) => (
            <li key={r.id}>
              <CheckRow label={r.name} checked={draft.regimenIds.includes(r.id)} onChange={() => setDraft({ ...draft, regimenIds: toggle(draft.regimenIds, r.id) })} />
            </li>
          ))}
          {regimens.length === 0 && <li className="t-caption">No regimens yet.</li>}
        </ul>
      )}
    </BottomSheet>
  );
}

function Drill({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button type="button" className={s.drill} onClick={onClick}>
      <span className={s.drillText}>
        <span className="t-overline">{label}</span>
        <span className={s.drillValue}>{value}</span>
      </span>
      <IconChevronRight size={18} aria-hidden />
    </button>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className={s.checkRow} onClick={onChange}>
      <Checkbox checked={checked} onChange={onChange} label={label} />
      <span>{label}</span>
    </div>
  );
}
