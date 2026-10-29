// B4.4/B4.5 filtering — shared by the server (API) and the client filter sheet (live "Show N results").
import type { Product, ProductState } from './types';

export type ProductSort = 'recent' | 'name' | 'brand' | 'rating';

export interface ProductFilters {
  state: ProductState;
  stepTypes: string[];
  categoryIds: string[];
  brands: string[];
  regimenIds: string[];
  minRating: number;
  allStates: boolean;
  sort: ProductSort;
}

export const DEFAULT_FILTERS: ProductFilters = { state: 'using', stepTypes: [], categoryIds: [], brands: [], regimenIds: [], minRating: 0, allStates: false, sort: 'recent' };

const STATES: ProductState[] = ['using', 'empty', 'wishlist'];
const SORTS: ProductSort[] = ['recent', 'name', 'brand', 'rating'];

export function parseFilters(params: URLSearchParams | Record<string, string | undefined>): ProductFilters {
  const get = (k: string) => (params instanceof URLSearchParams ? params.get(k) : params[k]) ?? null;
  const list = (k: string) => (get(k) ? get(k)!.split(',').filter(Boolean) : []);
  const state = get('state') as ProductState;
  const sort = get('sort') as ProductSort;
  const rating = Number(get('rating') ?? 0);
  return {
    state: STATES.includes(state) ? state : 'using',
    stepTypes: list('type'),
    categoryIds: list('category'),
    brands: list('brand'),
    regimenIds: list('regimen'),
    minRating: Number.isInteger(rating) && rating >= 0 && rating <= 5 ? rating : 0,
    allStates: get('all') === '1',
    sort: SORTS.includes(sort) ? sort : 'recent',
  };
}

export function filtersToQuery(f: ProductFilters): string {
  const q = new URLSearchParams();
  if (f.state !== 'using') q.set('state', f.state);
  if (f.stepTypes.length) q.set('type', f.stepTypes.join(','));
  if (f.categoryIds.length) q.set('category', f.categoryIds.join(','));
  if (f.brands.length) q.set('brand', f.brands.join(','));
  if (f.regimenIds.length) q.set('regimen', f.regimenIds.join(','));
  if (f.minRating) q.set('rating', String(f.minRating));
  if (f.allStates) q.set('all', '1');
  if (f.sort !== 'recent') q.set('sort', f.sort);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function hasActiveFilters(f: ProductFilters) {
  return f.stepTypes.length + f.categoryIds.length + f.brands.length + f.regimenIds.length > 0 || f.minRating > 0;
}

function matches(p: Product, f: ProductFilters) {
  if (f.stepTypes.length && !f.stepTypes.includes(p.step_type)) return false;
  if (f.categoryIds.length && !f.categoryIds.includes(p.category_id)) return false;
  if (f.brands.length && !f.brands.includes(p.brand)) return false;
  if (f.regimenIds.length && !p.regimen_ids.some((r) => f.regimenIds.includes(r))) return false;
  if (f.minRating && (p.star_rating ?? 0) < f.minRating) return false;
  return true;
}

const SORT_FNS: Record<ProductSort, (a: Product, b: Product) => number> = {
  recent: (a, b) => b.created_at.localeCompare(a.created_at),
  name: (a, b) => a.name.localeCompare(b.name),
  brand: (a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name),
  rating: (a, b) => (b.star_rating ?? -1) - (a.star_rating ?? -1),
};

export function filterProducts(all: Product[], f: ProductFilters) {
  const counts: Record<ProductState, number> = { using: 0, empty: 0, wishlist: 0 };
  for (const p of all) counts[p.state] += 1;
  const matching = all.filter((p) => matches(p, f));
  const items = (f.allStates ? matching : matching.filter((p) => p.state === f.state)).sort(SORT_FNS[f.sort]);
  return {
    items,
    counts,
    /** B4.5 cross-state discovery. */
    acrossAllStates: matching.length,
    inState: matching.filter((p) => p.state === f.state).length,
  };
}

export const STATE_LABEL: Record<ProductState, string> = { using: 'Using', empty: 'Empty', wishlist: 'Wishlist' };
export const SORT_LABEL: Record<ProductSort, string> = { recent: 'Recently added', name: 'Name', brand: 'Brand', rating: 'Rating' };
