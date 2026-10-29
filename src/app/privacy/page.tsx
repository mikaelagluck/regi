import { TopBar } from '@/components/atoms';

export const metadata = { title: 'Privacy Policy' };

/** Placeholder — final legal copy is listed under "Needs Mikaela" in PROGRESS.md. */
export default function Page() {
  return (
    <main id="main">
      <TopBar back={{ href: '/welcome' }} title="Privacy Policy" />
      <div style={{ padding: 'var(--space-5)' }}>
        <h1 className="t-title">Privacy Policy</h1>
        <p className="t-secondary" style={{ marginTop: 'var(--space-3)' }}>The full Privacy Policy is coming soon.</p>
      </div>
    </main>
  );
}
