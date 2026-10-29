'use client';
import { IconCopy, IconExternalLink, IconShare2 } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, BottomSheet, Button, TextArea, Toast, ToastHost, TopBar } from '@/components/atoms';
import { shareOrCopy } from '@/components/share/ShareCreate';
import { api } from '@/lib/client/api';
import { compactNumber } from '@/lib/format';
import { formatMonthDay } from '@/lib/logicalDate';
import type { Share } from '@/lib/types';
import s from './ShareDetail.module.css';

export function ShareDetail({ share, url }: { share: Share; url: string }) {
  const router = useRouter();
  const [description, setDescription] = useState(share.description ?? '');
  const [saving, setSaving] = useState(false);
  const [revoke, setRevoke] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const dirty = description.trim() !== (share.description ?? '');
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  async function save() {
    setSaving(true);
    await api(`/api/shares/${share.id}`, { method: 'PATCH', body: { description: description.trim() || null } });
    setSaving(false);
    flash('Description saved.');
    router.refresh();
  }

  async function doRevoke() {
    await api(`/api/shares/${share.id}`, { method: 'PATCH', body: { revoke: true } });
    setRevoke(false);
    router.refresh();
  }

  return (
    <>
      <TopBar back={{ href: '/profile/shares' }} title="Share" />
      <div className={s.body}>
        <header className={s.head}>
          <h1 className={s.title}>{share.entity_name}</h1>
          {share.is_active ? <Badge tone="share">Active</Badge> : <Badge tone="muted">Revoked</Badge>}
        </header>
        <p className="t-caption">Shared {formatMonthDay(share.created_at.slice(0, 10))}{share.revoked_at ? ` · revoked ${formatMonthDay(share.revoked_at.slice(0, 10))}` : ''}</p>
        <dl className={s.stats}>
          <div><dt>Views</dt><dd>{compactNumber(share.view_count)}</dd></div>
          <div><dt>Copies</dt><dd>{compactNumber(share.copy_count)}</dd></div>
          <div><dt>Link clicks</dt><dd>{compactNumber(share.link_click_count)}</dd></div>
        </dl>

        {share.is_active && (
          <>
            <label className={s.linkBox}>
              <span className="t-overline">Link</span>
              <input readOnly value={url} className={s.link} onFocus={(e) => e.currentTarget.select()} />
            </label>
            <div className={s.row}>
              <Button variant="outline" icon={<IconCopy size={16} aria-hidden />} onClick={async () => { await navigator.clipboard.writeText(url).catch(() => {}); flash('Link copied.'); }}>Copy link</Button>
              <Button variant="share" icon={<IconShare2 size={16} aria-hidden />} onClick={async () => { const r = await shareOrCopy({ title: share.entity_name, url }); if (r === 'copied') flash('Link copied.'); }}>Share</Button>
            </div>
            <a href={url} target="_blank" rel="noopener noreferrer" className="t-link">Open public page <IconExternalLink size={12} aria-hidden /></a>
            <TextArea label="Description" optional value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} rows={3} hint="Shown on the public page." />
            <Button variant="ink" onClick={save} disabled={!dirty} loading={saving}>Save description</Button>
            <Button variant="destructive" onClick={() => setRevoke(true)}>Revoke link</Button>
          </>
        )}
      </div>
      <BottomSheet
        open={revoke}
        onClose={() => setRevoke(false)}
        title="Revoke this link?"
        description="Anyone who opens it will see that it's no longer active. People who already copied it keep their copy."
        footer={<><Button variant="ghost" onClick={() => setRevoke(false)}>Cancel</Button><Button variant="ink" onClick={doRevoke}>Revoke</Button></>}
      />
      {toast && <ToastHost><Toast tone="share">{toast}</Toast></ToastHost>}
    </>
  );
}
