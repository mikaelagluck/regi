'use client';
import { IconBookmark, IconBookmarkFilled } from '@tabler/icons-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Toast, ToastHost } from '@/components/atoms';
import s from './SharePage.module.css';

/** Counts the view once per page load (deduped per viewer/day on the server). */
export function TrackView({ slug }: { slug: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    fetch(`/api/public/r/${slug}/track-view`, { method: 'POST' }).catch(() => {});
  }, [slug]);
  return null;
}

async function addToWishlist(slug: string, stepId?: string) {
  return fetch(`/api/shares/${slug}/wishlist-add`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stepId ? { step_id: stepId } : {}) });
}

/** Bookmark → wishlist (B7.5). Signed-out visitors sign in first and the add completes on return. */
export function WishlistButton({ slug, stepId, label, variant = 'chip' }: { slug: string; stepId?: string; label: string; variant?: 'chip' | 'button' }) {
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function go() {
    const res = await addToWishlist(slug, stepId);
    if (res.status === 401) {
      const back = `${pathname}?wishlist=${stepId ?? 'product'}`;
      router.push(`/welcome?next=${encodeURIComponent(back)}`);
      return;
    }
    if (res.ok) {
      setSaved(true);
      setToast(`${label} added to your wishlist.`);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <>
      {variant === 'chip' ? (
        <button type="button" className={`${s.chip} ${saved ? s.chipOn : ''}`} onClick={go} aria-label={saved ? `${label} is on your wishlist` : `Add ${label} to my wishlist`} disabled={saved}>
          {saved ? <IconBookmarkFilled size={14} aria-hidden /> : <IconBookmark size={14} aria-hidden />}
        </button>
      ) : (
        <button type="button" className={s.wishBtn} onClick={go} disabled={saved}>
          {saved ? <IconBookmarkFilled size={16} aria-hidden /> : <IconBookmark size={16} aria-hidden />} {saved ? 'On your wishlist' : 'Add to my wishlist'}
        </button>
      )}
      {toast && (
        <ToastHost>
          <Toast tone="share">{toast}</Toast>
        </ToastHost>
      )}
    </>
  );
}

/** Completes a wishlist add that was waiting on sign-in (?wishlist=<stepId|product>). */
export function PendingWishlist({ slug }: { slug: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const pending = params.get('wishlist');
  const [toast, setToast] = useState<string | null>(null);
  const ran = useRef(false);
  useEffect(() => {
    if (!pending || ran.current) return;
    ran.current = true;
    addToWishlist(slug, pending === 'product' ? undefined : pending).then((res) => {
      if (res.ok) setToast('Added to your wishlist.');
      router.replace(pathname, { scroll: false });
    });
  }, [pending, slug, router, pathname]);
  return toast ? (
    <ToastHost>
      <Toast tone="share">{toast}</Toast>
    </ToastHost>
  ) : null;
}
