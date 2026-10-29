import 'server-only';
import type { Tx } from '@/lib/db';
import { logicalDate } from '@/lib/logicalDate';
import { resolveDay, type Assignment } from '@/lib/schedule';

export function pushConfigured() {
  return !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;
}

/** Queue the wait-timer push (C1.4: scheduled at +N seconds when the timer starts). */
export async function scheduleTimerNotification(tx: Tx, userId: string, stepInstanceId: string, sendAt: Date, stepLabel: string, nextLabel: string | null) {
  const prefs = await tx.one<{ on: boolean }>('select notify_timer_alerts as on from users where id = $1', [userId]);
  if (!prefs?.on) return;
  await tx.q(
    `insert into scheduled_notifications (user_id, kind, send_at, title, body, url, dedupe_key)
     values ($1, 'timer', $2, 'Wait’s over', $3, '/today', $4)
     on conflict (dedupe_key) do update set send_at = excluded.send_at, body = excluded.body, sent_at = null, cancelled_at = null`,
    [userId, sendAt.toISOString(), nextLabel ? `Time for ${nextLabel}.` : `${stepLabel} is done.`, `timer:${stepInstanceId}`],
  );
}

/** C3.4: skip-wait override cancels the scheduled notification. */
export async function cancelTimerNotification(tx: Tx, stepInstanceId: string) {
  await tx.q(`update scheduled_notifications set cancelled_at = now() where dedupe_key = $1 and sent_at is null`, [`timer:${stepInstanceId}`]);
}

interface Due {
  id: string;
  user_id: string;
  title: string;
  body: string;
  url: string | null;
}

/**
 * Cron: queue due regimen reminders, then dispatch everything due via Web Push.
 * Without VAPID keys sending is stubbed (logged and marked sent) so the pipeline still runs.
 */
export async function dispatchDue(tx: Tx, now: Date) {
  await queueReminders(tx, now);
  const due = await tx.q<Due>(
    `select n.id, n.user_id, n.title, n.body, n.url from scheduled_notifications n
      where n.sent_at is null and n.cancelled_at is null and n.send_at <= $1
      order by n.send_at limit 500`,
    [now.toISOString()],
  );
  let sent = 0;
  let stubbed = 0;
  const webpush = pushConfigured() ? (await import('web-push')).default : null;
  webpush?.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:hello@regi.app', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);

  for (const n of due) {
    const subs = await tx.q<{ id: string; endpoint: string; p256dh: string; auth: string }>('select id, endpoint, p256dh, auth from push_subscriptions where user_id = $1', [n.user_id]);
    if (!webpush) {
      console.info(`[push stub] to ${n.user_id} (${subs.length} device(s)): ${n.title} — ${n.body}`);
      stubbed += 1;
    } else {
      for (const s of subs) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: n.title, body: n.body, url: n.url ?? '/today' }));
          sent += 1;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await tx.q('delete from push_subscriptions where id = $1', [s.id]);
          else console.error('[push] send failed', status);
        }
      }
    }
    await tx.q('update scheduled_notifications set sent_at = $2 where id = $1', [n.id, now.toISOString()]);
  }
  return { due: due.length, sent, stubbed };
}

/** Regimen reminders: per-regimen reminder_time, in each user's timezone, once per logical day. */
async function queueReminders(tx: Tx, now: Date) {
  const rows = await tx.q<{ id: string; owner_user_id: string; name: string; reminder_time: string; timezone: string }>(
    `select r.id, r.owner_user_id, r.name, r.reminder_time::text as reminder_time, u.timezone
       from regimens r join users u on u.id = r.owner_user_id
      where r.reminder_time is not null and not r.is_archived and u.notify_regimen_reminders`,
  );
  const byUser = new Map<string, typeof rows>();
  for (const r of rows) byUser.set(r.owner_user_id, [...(byUser.get(r.owner_user_id) ?? []), r]);
  for (const [userId, regs] of byUser) {
    const tz = regs[0].timezone;
    const date = logicalDate(now, tz);
    const assignments = await tx.q<Assignment>(
      `select id, regimen_id, schedule_type::text as schedule_type, recurrence_rule, start_date, end_date, priority, time_of_day::text as time_of_day, created_at
         from schedule_assignments where user_id = $1`,
      [userId],
    );
    const scheduled = new Set(Object.values(resolveDay(assignments, date)).map((a) => a!.regimen_id));
    const hm = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
    for (const r of regs) {
      if (!scheduled.has(r.id) || hm < r.reminder_time.slice(0, 5)) continue;
      const done = await tx.one<{ c: boolean }>('select completed_at is not null as c from regimen_instances where regimen_id = $1 and date = $2', [r.id, date]);
      if (done?.c) continue;
      await tx.q(
        `insert into scheduled_notifications (user_id, kind, send_at, title, body, url, dedupe_key)
         values ($1, 'reminder', $2, $3, 'Your regimen is ready when you are.', '/today', $4) on conflict (dedupe_key) do nothing`,
        [userId, now.toISOString(), r.name, `reminder:${r.id}:${date}`],
      );
    }
  }
}
