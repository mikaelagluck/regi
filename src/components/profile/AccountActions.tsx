'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BottomSheet, Button, TextField } from '@/components/atoms';
import { api } from '@/lib/client/api';
import s from './AccountActions.module.css';

/** Sign out (destructive style, centred, confirmed) and account deletion (CLAUDE.md conflict #9). */
export function AccountActions({ username }: { username: string }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<'signout' | 'delete' | null>(null);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function signOut() {
    setBusy(true);
    await api('/api/auth/signout', { method: 'POST' });
    router.replace('/welcome');
    router.refresh();
  }

  async function del() {
    setBusy(true);
    setError(undefined);
    try {
      await api('/api/me', { method: 'DELETE', body: { confirm } });
      router.replace('/welcome');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className={s.wrap}>
      <Button variant="destructive" onClick={() => setSheet('signout')}>Sign out</Button>
      <button type="button" className={s.delete} onClick={() => { setConfirm(''); setSheet('delete'); }}>Delete account</button>

      <BottomSheet
        open={sheet === 'signout'}
        onClose={() => setSheet(null)}
        title="Sign out of regi?"
        footer={<><Button variant="ghost" onClick={() => setSheet(null)}>Cancel</Button><Button variant="ink" onClick={signOut} loading={busy}>Sign out</Button></>}
      />
      <BottomSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title="Delete your account?"
        description="This permanently deletes your products, regimens, history, journal notes and shares. Shared links stop working. This can't be undone."
        footer={<><Button variant="ghost" onClick={() => setSheet(null)}>Cancel</Button><Button variant="ink" onClick={del} disabled={confirm.toLowerCase() !== username} loading={busy}>Delete forever</Button></>}
      >
        <TextField label={`Type your username (${username}) to confirm`} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        {error && <p role="alert" className={s.error}>{error}</p>}
      </BottomSheet>
    </div>
  );
}
