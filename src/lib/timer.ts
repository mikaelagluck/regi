// Wait timers derive from timer_started_at + duration — never from a ticking counter (C3.4).

export interface TimerState {
  elapsedSeconds: number;
  remainingSeconds: number;
  /** 0 → 1 */
  fraction: number;
  done: boolean;
}

export function timerState(startedAtIso: string, waitSeconds: number, nowMs: number): TimerState {
  const elapsedMs = Math.max(0, nowMs - Date.parse(startedAtIso));
  const totalMs = Math.max(1, waitSeconds * 1000);
  const fraction = Math.min(1, elapsedMs / totalMs);
  const remainingSeconds = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
  return { elapsedSeconds: Math.floor(elapsedMs / 1000), remainingSeconds, fraction, done: fraction >= 1 };
}

/** "4:23" */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "5 min" · "1 min 30 sec" · "45 sec" */
export function formatWait(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m && s) return `${m} min ${s} sec`;
  if (m) return `${m} min`;
  return `${s} sec`;
}

/** "4 minutes 23 seconds" for the skip-wait sheet (B3.7). */
export function formatRemainingLong(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const parts = [];
  if (m) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
  if (s || !m) parts.push(`${s} second${s === 1 ? '' : 's'}`);
  return parts.join(' ');
}

/** B3.4: first regimen (in time-of-day order) not yet complete; all complete → the last one. */
export function defaultRegimenIndex(regimens: { completed: boolean }[]): number {
  if (regimens.length === 0) return -1;
  const i = regimens.findIndex((r) => !r.completed);
  return i === -1 ? regimens.length - 1 : i;
}
