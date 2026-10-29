'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** The client sends its IANA timezone; the server stores it for logicalDate() (CLAUDE.md). */
export function TimezoneSync({ current }: { current: string }) {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || tz === current) return;
    fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timezone: tz }) })
      .then((r) => r.ok && router.refresh())
      .catch(() => {});
  }, [current, router]);
  return null;
}
