import 'server-only';
import { notFound } from 'next/navigation';
import { HttpError } from './api';

/** In server components: turn missing rows (or malformed ids) into the 404 page. */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if ((e instanceof HttpError && e.status === 404) || (e as { code?: string }).code === '22P02') notFound();
    throw e;
  }
}
