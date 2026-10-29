'use client';
import { IconCheck, IconCopy, IconShare2 } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, TextArea, TextAction, Toast, ToastHost, TopBar } from '@/components/atoms';
import { api } from '@/lib/client/api';
import s from './ShareCreate.module.css';

/** Web Share API with a copy-link fallback. Returns what happened for the confirmation copy. */
export async function shareOrCopy(data: { title: string; text?: string; url: string }): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  if (typeof navigator !== 'undefined' && navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(data.url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export function ShareCreate({ type, id, name }: { type: 'regimen' | 'user_product'; id: string; name: string }) {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const noun = type === 'regimen' ? 'regimen' : 'product';

  async function send(link: string) {
    const r = await shareOrCopy({ title: `${name} on regi`, text: description || `My ${noun} on regi`, url: link });
    if (r === 'copied') setToast('Link copied.');
    else if (r === 'shared') setToast('Sent.');
    else if (r === 'failed') setToast('Copy the link below to share it.');
  }

  async function create() {
    setBusy(true);
    setError(undefined);
    try {
      const share = await api<{ url: string }>('/api/shares', { body: { entity_type: type, entity_id: id, description: description.trim() || null } });
      setUrl(share.url);
      await send(share.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.screen}>
      <TopBar
        leading={<TextAction onClick={() => router.back()}>{url ? 'Done' : 'Cancel'}</TextAction>}
        trailing={!url && <Button variant="share" size="sm" onClick={create} loading={busy}>Create link</Button>}
      />
      <div className={s.body}>
        <header>
          <h1 className={s.title}>Share {name}</h1>
          <p className="t-caption">{type === 'regimen' ? 'Anyone with the link can view and copy this regimen.' : 'Anyone with the link can see this product and add it to their wishlist.'}</p>
        </header>

        {!url ? (
          <>
            <TextArea label="Description" optional value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} placeholder={type === 'regimen' ? 'What I do every weekday morning…' : 'Why I love it…'} hint={`Helps recipients understand what this ${noun} is for.`} rows={4} />
            {error && <p role="alert" className={s.error}>{error}</p>}
            <Button variant="share" block onClick={create} loading={busy} icon={<IconShare2 size={16} aria-hidden />}>Create link</Button>
            <p className={s.voice}>Make someone&apos;s morning a little better.*</p>
          </>
        ) : (
          <div className={s.done}>
            <div className={s.badge}><IconCheck size={18} aria-hidden /> Link ready</div>
            <label className={s.linkBox}>
              <span className="sr-only">Share link</span>
              <input readOnly value={url} className={s.link} onFocus={(e) => e.currentTarget.select()} />
            </label>
            <div className={s.row}>
              <Button variant="outline" icon={<IconCopy size={16} aria-hidden />} onClick={async () => { await navigator.clipboard.writeText(url).catch(() => {}); setToast('Link copied.'); }}>Copy link</Button>
              <Button variant="share" icon={<IconShare2 size={16} aria-hidden />} onClick={() => send(url)}>Share again</Button>
            </div>
            <Link href="/profile/shares" className="t-link">See all your shares</Link>
          </div>
        )}
      </div>
      {toast && (
        <ToastHost>
          <Toast tone="share" icon={<IconShare2 size={16} aria-hidden />}>{toast}</Toast>
        </ToastHost>
      )}
    </div>
  );
}
