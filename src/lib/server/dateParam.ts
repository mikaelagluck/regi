import 'server-only';
import { isLogicalDate } from '@/lib/logicalDate';
import { badRequest } from './api';

export function dateParam(d: string): string {
  if (!isLogicalDate(d)) throw badRequest('Invalid date');
  return d;
}
