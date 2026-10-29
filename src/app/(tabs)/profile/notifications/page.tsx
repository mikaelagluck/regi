import { NotificationSettings } from '@/components/profile/NotificationSettings';
import { requireProfile } from '@/lib/auth/session';

export const metadata = { title: 'Notifications' };

/** [notifications] B8.3 — three master toggles; per-regimen reminder times live on the regimen. */
export default async function NotificationsPage() {
  const { profile } = await requireProfile();
  return (
    <NotificationSettings
      initial={{ notify_regimen_reminders: profile.notify_regimen_reminders, notify_timer_alerts: profile.notify_timer_alerts, notify_share_activity: profile.notify_share_activity }}
      pushConfigured={!!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
    />
  );
}
