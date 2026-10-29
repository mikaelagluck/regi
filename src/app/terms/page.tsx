import { TopBar } from '@/components/atoms';

export const metadata = { title: 'Terms' };

/** Placeholder — final legal copy is listed under "Needs Mikaela" in PROGRESS.md. */
export default function Page() {
  return (
    <main id="main">
      <TopBar back={{ href: '/welcome' }} title="Terms" />
      <div style={{ padding: 'var(--space-5)' }}>
        <h1 className="t-title">Terms</h1>
        <p className="t-secondary" style={{ marginTop: 'var(--space-3)' }}>The full Terms is coming soon.</p>
      </div>
    </main>
  );
}
