'use client';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, TextField, TopBar } from '@/components/atoms';
import { api } from '@/lib/client/api';
import s from './username.module.css';

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function UsernameForm({ next, initialDisplayName }: { next: string; initialDisplayName: string }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [result, setResult] = useState<{ u: string; available: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const u = username.trim().toLowerCase();
  const valid = /^[a-z0-9_]{3,20}$/.test(u);
  const status: Status = !u ? 'idle' : !valid ? 'invalid' : result?.u === u ? (result.available ? 'available' : 'taken') : 'checking';

  useEffect(() => {
    if (!valid) return;
    const t = setTimeout(async () => {
      try {
        const r = await api<{ available: boolean }>(`/api/me/username?u=${encodeURIComponent(u)}`);
        setResult({ u, available: r.available });
      } catch {
        /* leave as "checking"; the submit will surface errors */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [u, valid]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api('/api/me/username', {
        body: { username: username.trim().toLowerCase(), display_name: displayName || null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar trailing={<span className={s.step}>Step 2 of 2</span>} />
      <form className={s.form} onSubmit={submit} noValidate>
        <div>
          <h1 className={s.title}>Pick a username</h1>
          <p className={s.sub}>This is how you&apos;ll appear when you share regimens. You can&apos;t change it later.</p>
        </div>
        <div>
          <TextField
            label="Username"
            lead="@"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            maxLength={20}
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
            placeholder="sarahskincare"
            aria-describedby="username-status"
          />
          <p id="username-status" className={`${s.status} ${s[status]}`} aria-live="polite">
            {status === 'available' && (<><IconCheck size={14} stroke={2.5} aria-hidden /> Available</>)}
            {status === 'taken' && (<><IconX size={14} stroke={2.5} aria-hidden /> Taken</>)}
            {status === 'invalid' && '3–20 characters: letters, numbers or underscores'}
            {status === 'checking' && 'Checking…'}
          </p>
        </div>
        <TextField label="Display name" optional value={displayName} maxLength={60} onChange={(e) => setDisplayName(e.target.value)} placeholder="Sarah Mitchell" autoComplete="name" />
        {error && <p role="alert" className={s.error}>{error}</p>}
        <Button type="submit" variant="primary" block disabled={status !== 'available'} loading={busy}>
          Continue
        </Button>
      </form>
    </>
  );
}
