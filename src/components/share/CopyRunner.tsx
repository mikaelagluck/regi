'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ButtonLink, Logo } from '@/components/atoms';
import s from './SharePage.module.css';

export function CopyRunner({ slug }: { slug: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    fetch(`/api/shares/${slug}/copy`, { method: 'POST' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(res.status === 404 ? 'This link isn’t active anymore.' : (data.error ?? 'Couldn’t copy this regimen.'));
        router.replace(`/regimens/${data.id}?toast=copied`);
      })
      .catch((e: Error) => setError(e.message));
  }, [slug, router]);
  return (
    <main id="main" className={s.gone} aria-live="polite">
      <Logo size="card" />
      {error ? (
        <>
          <p className="t-headline">{error}</p>
          <ButtonLink href="/regimens" variant="outline">Go to my regimens</ButtonLink>
        </>
      ) : (
        <p className="t-headline">Adding it to your regimens…</p>
      )}
    </main>
  );
}
