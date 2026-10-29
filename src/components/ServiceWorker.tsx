'use client';
import { useEffect } from 'react';

/** Registers the service worker (offline shell + push). Skipped in `next dev` to avoid stale caches. */
export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  }, []);
  return null;
}
