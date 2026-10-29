'use client';
import { IconBrandApple, IconBrandGoogle, IconMail } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button, ButtonLink, Logo, TextField } from '@/components/atoms';
import { api } from '@/lib/client/api';
import s from './welcome.module.css';

interface Props {
  next: string;
  error?: string;
  google: boolean;
  googleLive: boolean;
  apple: boolean;
  devMode: boolean;
}

export function WelcomeScreen({ next, error, google, googleLive, apple, devMode }: Props) {
  const [mode, setMode] = useState<'choose' | 'email' | 'sent'>('choose');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | undefined>(error);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(undefined);
    try {
      const res = await api<{ sent: boolean; devLink?: string }>('/api/auth/email', { body: { email, next } });
      setDevLink(res.devLink ?? null);
      setMode('sent');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const oauthHref = (provider: string) => `/auth/google?provider=${provider}&next=${encodeURIComponent(next)}`;

  return (
    <div className={s.screen}>
      <div className={s.brand}>
        <Logo size="hero" as="h1" />
        <p className={s.tagline}>Track your regimens. Keep your streak. Share what works.</p>
      </div>

      <div className={s.actions}>
        {err && <p className={s.error} role="alert">{err}</p>}

        {mode === 'choose' && (
          <>
            {apple && (
              <ButtonLink href={oauthHref('apple')} variant="ink" block icon={<IconBrandApple size={18} aria-hidden />}>
                Continue with Apple
              </ButtonLink>
            )}
            {google &&
              (googleLive ? (
                <ButtonLink href={oauthHref('google')} variant={apple ? 'outline' : 'ink'} block icon={<IconBrandGoogle size={18} aria-hidden />}>
                  Continue with Google
                </ButtonLink>
              ) : (
                <Button variant={apple ? 'outline' : 'ink'} block icon={<IconBrandGoogle size={18} aria-hidden />} onClick={() => setErr('Google sign-in isn’t set up on this server yet (dev mode). Continue with email instead.')}>
                  Continue with Google
                </Button>
              ))}
            <Button variant={google || apple ? 'outline' : 'ink'} block icon={<IconMail size={18} aria-hidden />} onClick={() => setMode('email')}>
              Continue with email
            </Button>
          </>
        )}

        {mode === 'email' && (
          <form onSubmit={send} className={s.form}>
            <TextField label="Email" type="email" inputMode="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            <Button type="submit" variant="primary" block loading={busy} disabled={!email}>
              Send magic link
            </Button>
            <Button variant="ghost" block onClick={() => setMode('choose')}>
              Back
            </Button>
          </form>
        )}

        {mode === 'sent' && (
          <div className={s.sent} role="status">
            <p className={s.sentTitle}>Check your email</p>
            <p className={s.sentBody}>We sent a sign-in link to {email}. Open it on this device.</p>
            {devMode && devLink && (
              <ButtonLink href={devLink} variant="primary" block>
                Open magic link (dev)
              </ButtonLink>
            )}
            <Button variant="ghost" block onClick={() => setMode('email')}>
              Use a different email
            </Button>
          </div>
        )}

        <p className={s.footer}>
          By continuing you agree to our <Link href="/terms" className="t-link">Terms</Link> and <Link href="/privacy" className="t-link">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
