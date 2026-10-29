import { CalendarEmpty } from '@/components/calendar/CalendarEmpty';
import { MonthView } from '@/components/calendar/MonthView';
import { ProductsScreen } from '@/components/products/ProductsScreen';
import { RegimensScreen } from '@/components/regimens/RegimensScreen';
import { TodayScreen } from '@/components/today/TodayScreen';
import { DEFAULT_FILTERS } from '@/lib/productFilters';
import { dayEmpty, dayPopulated, dayRetro, month, products, regimens } from './fixtures';
import s from './screens.module.css';

export const metadata = { title: 'Screens' };

function Frame({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className={s.item} aria-labelledby={`f-${id}`}>
      <h2 id={`f-${id}`} className={s.label}>{title} <code>{id}</code></h2>
      <div className={s.frame}>{children}</div>
    </section>
  );
}

/** Dev-only screen gallery: fixtures in empty / populated / edge states (CLAUDE.md). Actions are inert. */
export default function ScreensGallery() {
  return (
    <div className={s.page}>
      <h1 className="t-title">Screens</h1>
      <p className="t-caption">Fixture data, no database. Interactions that call the API will fail here by design.</p>
      <div className={s.grid}>
        <Frame id="empty-today" title="Today — empty"><TodayScreen initial={dayEmpty} /></Frame>
        <Frame id="today-01" title="Today — populated, timer running"><TodayScreen initial={dayPopulated} /></Frame>
        <Frame id="today-retro" title="Today — past day, retro-logged"><TodayScreen initial={dayRetro} /></Frame>
        <Frame id="empty-products" title="Products — empty"><ProductsScreen products={[]} categories={[]} regimens={[]} filters={DEFAULT_FILTERS} /></Frame>
        <Frame id="products-01" title="Products — Treat filter, cross-state hint"><ProductsScreen products={products} categories={[]} regimens={[]} filters={{ ...DEFAULT_FILTERS, stepTypes: ['treat'] }} /></Frame>
        <Frame id="regimens-01" title="Regimens — Mine"><RegimensScreen regimens={regimens} archivedCount={3} folder="mine" /></Frame>
        <Frame id="regimens-shared" title="Regimens — Shared (grouped by recipient)"><RegimensScreen regimens={regimens} archivedCount={0} folder="shared" /></Frame>
        <Frame id="empty-calendar" title="Calendar — empty"><CalendarEmpty today="2026-05-07" /></Frame>
        <Frame id="calendar-month" title="Calendar — month, all dot states"><MonthView data={month} selected="2026-05-07" summary={{ date: '2026-05-07', today: '2026-05-07', regimens: [{ regimen_id: 'am', name: 'Daily Morning', time_of_day: 'morning', done: 4, total: 4, skipped: false }, { regimen_id: 'pm', name: 'Daily Evening', time_of_day: 'evening', done: 2, total: 3, skipped: false }], journal: 'Skin felt tight after VitC, switched to a gentler moisturizer for the evening.' }} /></Frame>
      </div>
    </div>
  );
}
