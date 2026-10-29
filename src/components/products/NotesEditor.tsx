'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/atoms';
import { api } from '@/lib/client/api';
import s from './NotesEditor.module.css';

/** B4.7 Notes: user's free-form text, editable on tap. */
export function NotesEditor({ productId, initial }: { productId: string; initial: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await api(`/api/products/${productId}`, { method: 'PATCH', body: { notes: value.trim() || null } });
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <section className={s.wrap}>
      <h2 className="t-overline" id="notes-h">Notes</h2>
      {editing ? (
        <div className={s.edit}>
          <textarea className={s.area} value={value} onChange={(e) => setValue(e.target.value)} aria-labelledby="notes-h" autoFocus rows={4} />
          <div className={s.buttons}>
            <Button variant="ghost" size="sm" onClick={() => { setValue(initial ?? ''); setEditing(false); }}>Cancel</Button>
            <Button variant="ink" size="sm" onClick={save} loading={busy}>Save</Button>
          </div>
        </div>
      ) : (
        <button type="button" className={s.view} onClick={() => setEditing(true)} aria-label={initial ? `Notes: ${initial}. Tap to edit` : 'Add notes'}>
          {initial ? <span>{initial}</span> : <span className="t-secondary">Tap to add notes</span>}
        </button>
      )}
    </section>
  );
}
