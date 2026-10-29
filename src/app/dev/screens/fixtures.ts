import type { CalendarMonth, DayPayload, Product, RegimenSummary } from '@/lib/types';

const now = new Date('2026-05-07T12:00:00Z').toISOString();
const step = (key: string, label: string, brand: string | null, step_type: DayPayload['regimens'][number]['steps'][number]['step_type'], extra: Partial<DayPayload['regimens'][number]['steps'][number]> = {}) => ({
  key, regimen_step_id: key, step_instance_id: null, label, brand, step_type, user_product_id: null, wait_seconds_after: 0, notes: null, checked_at: null, timer_started_at: null, retroactive: false, ...extra,
});

export const dayEmpty: DayPayload = { date: '2026-05-07', today: '2026-05-07', regimens: [], streak: 0, lifetime: 0, serverNow: now, hasAnyRegimen: false };

export const dayPopulated: DayPayload = {
  date: '2026-05-07', today: '2026-05-07', streak: 12, lifetime: 347, serverNow: now, hasAnyRegimen: true,
  regimens: [
    { regimen_id: 'am', name: 'Daily Morning', time_of_day: 'morning', instance_id: 'i1', completed_at: null, skipped: false, journal_note: null, done_count: 2, total: 4,
      steps: [
        step('s1', 'Gentle Cleanser', 'CeraVe', 'cleanse', { checked_at: now }),
        step('s2', 'Vitamin C Serum', 'SkinCeuticals', 'treat', { wait_seconds_after: 300, timer_started_at: new Date(Date.parse(now) - 150_000).toISOString() }),
        step('s3', 'Moisturizer', 'Cetaphil', 'moisturize'),
        step('s4', 'SPF 50', 'Beauty of Joseon', 'protect'),
      ] },
    { regimen_id: 'pm', name: 'Daily Evening', time_of_day: 'evening', instance_id: null, completed_at: null, skipped: false, journal_note: null, done_count: 0, total: 3,
      steps: [step('e1', 'Oil Cleanser', 'DHC', 'cleanse'), step('e2', 'Tretinoin 0.025%', null, 'treat'), step('e3', 'Night Cream', 'Clinique', 'moisturize')] },
  ],
};

export const dayRetro: DayPayload = {
  ...dayPopulated, date: '2026-05-05', streak: 12,
  regimens: [{ ...dayPopulated.regimens[0], completed_at: now, done_count: 4, steps: dayPopulated.regimens[0].steps.map((x) => ({ ...x, timer_started_at: null, checked_at: now, retroactive: x.key !== 's1' })) }],
};

const prod = (id: string, brand: string, name: string, step_type: Product['step_type'], extra: Partial<Product> = {}): Product => ({
  id, brand, name, category_id: 'c', category_name: 'Category', step_type, image_url: null, state: 'using', star_rating: 4, notes: null, affiliate_url: null, started_on: '2026-04-12', finished_on: null, repurchase_count: 0, created_at: now, updated_at: now, regimen_ids: [], ...extra,
});

export const products: Product[] = [
  prod('p1', 'SkinCeuticals', 'CE Ferulic Vitamin C', 'treat', { star_rating: 5 }),
  prod('p2', 'The Ordinary', 'Niacinamide 10% + Zinc 1%', 'treat', { repurchase_count: 2, star_rating: 3 }),
  prod('p3', "Paula's Choice", '2% BHA Liquid Exfoliant with a very long name that wraps', 'treat', { state: 'empty' }),
  prod('p4', 'La Roche-Posay', 'Effaclar Duo+', 'treat', { star_rating: null }),
  prod('p5', 'Anua', 'Heartleaf 77% Toner', 'treat', { state: 'wishlist' }),
];

export const regimens: RegimenSummary[] = [
  { id: 'r1', name: 'Daily Morning', time_of_day: 'morning', target_user_label: null, reminder_time: null, is_archived: false, cloned_from_regimen_id: null, created_at: now, step_count: 4, schedule: { mode: 'recurring', text: 'Mon, Wed, Fri' } },
  { id: 'r2', name: 'Tret Mornings', time_of_day: 'morning', target_user_label: null, reminder_time: null, is_archived: false, cloned_from_regimen_id: null, created_at: now, step_count: 5, schedule: { mode: 'recurring', text: 'Tue, Thu' } },
  { id: 'r3', name: 'Travel Light', time_of_day: 'morning', target_user_label: null, reminder_time: null, is_archived: false, cloned_from_regimen_id: null, created_at: now, step_count: 3, schedule: { mode: 'range', text: 'daily during trip', range: { from: '2026-05-12', to: '2026-05-19' } } },
  { id: 'r4', name: 'Daily Evening', time_of_day: 'evening', target_user_label: null, reminder_time: null, is_archived: false, cloned_from_regimen_id: null, created_at: now, step_count: 4, schedule: { mode: 'recurring', text: 'Every day' } },
  { id: 'r5', name: "Mum's Basics", time_of_day: 'evening', target_user_label: 'Mum', reminder_time: null, is_archived: false, cloned_from_regimen_id: null, created_at: now, step_count: 3, schedule: { mode: 'none', text: 'Not scheduled' } },
];

const states = ['complete', 'complete', 'partial', 'skipped', 'none'] as const;
export const month: CalendarMonth = {
  month: '2026-05', today: '2026-05-07', streak: 12, hasHistory: true,
  days: Array.from({ length: 31 }, (_, i) => {
    const date = `2026-05-${String(i + 1).padStart(2, '0')}`;
    const future = date > '2026-05-07';
    return { date, future, dots: future ? [] : [{ regimen_id: 'am', time_of_day: 'morning' as const, state: states[i % 5] }, { regimen_id: 'pm', time_of_day: 'evening' as const, state: states[(i + 2) % 5] }] };
  }),
};
