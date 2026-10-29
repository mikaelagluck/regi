import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Dev-only galleries (CLAUDE.md: Storybook-free previews). Hidden in production. */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_AUTH !== '1') notFound();
  return <main id="main">{children}</main>;
}
