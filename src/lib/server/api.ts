import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { getProfile, getSessionUser, type Profile, type SessionUser } from '@/lib/auth/session';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Not found') => new HttpError(404, what);
export const badRequest = (msg: string) => new HttpError(400, msg);

type Ctx<P> = { params: Promise<P> };

/** Route handler wrapper: auth (401), zod validation (400), Postgres RLS / not-found errors. */
export function authed<P = Record<string, string>>(
  fn: (args: { req: Request; user: SessionUser; profile: Profile; params: P }) => Promise<unknown>,
) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      const user = await getSessionUser();
      if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
      const profile = await getProfile(user.id);
      if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 401 });
      const out = await fn({ req, user, profile, params: await ctx.params });
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof ZodError) return NextResponse.json({ error: 'Invalid request', issues: e.issues }, { status: 400 });
  const pg = e as { code?: string; message?: string };
  if (pg?.code === '42501' || /row-level security|permission denied/.test(pg?.message ?? '')) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }
  if (pg?.code === '23505') return NextResponse.json({ error: 'Already exists' }, { status: 409 });
  if (pg?.code === 'P0002') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (pg?.code === '22023' || pg?.code === '23514' || pg?.code === '22P02') return NextResponse.json({ error: pg.message ?? 'Invalid' }, { status: 400 });
  console.error(e);
  return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
}

export async function body<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown = {};
  try {
    json = await req.json();
  } catch {
    json = {};
  }
  return schema.parse(json);
}
