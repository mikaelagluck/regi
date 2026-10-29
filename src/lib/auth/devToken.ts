import 'server-only';
import crypto from 'node:crypto';

// Signed tokens for Docker-free local development (dev sign-in + the simulated magic link).

function secret(): string {
  const s = process.env.DEV_AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') throw new Error('DEV_AUTH_SECRET is required');
  return 'regi-dev-only-secret';
}

const b64 = (s: string) => Buffer.from(s).toString('base64url');

export function sign(payload: Record<string, unknown>, ttlSeconds: number): string {
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verify<T extends Record<string, unknown>>(token: string | undefined | null): T | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString()) as T & { exp: number };
    return data.exp > Date.now() / 1000 ? data : null;
  } catch {
    return null;
  }
}
