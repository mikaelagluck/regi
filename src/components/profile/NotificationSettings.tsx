'use client';
import { useEffect, useState } from 'react';
import { Button, Switch, TopBar } from '@/components/atoms';
import { api } from '@/lib/client/api';
import { subscribePush } from '@/lib/client/push';
import s from './NotificationSettings.module.css';

type Prefs = { notify_regimen_reminders: boolean; notify_timer_alerts: boolean; notify_share_activity: boolean };
type Perm = 'unsupported' | 'default' | 'granted' | 'denied';

export function NotificationSettings({ initial, pushConfigured }: { initial: Prefs; pushConfigured: boolean }) {
  const [prefs, setPrefs] = useState(initial);
  const [perm, setPerm] = useState<Perm>('default');
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    // Browser capabilities are only knowable on the client.
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    const p: Perm = supported ? (Notification.permission as Perm) : 'unsupported';
    const sa = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    queueMicrotask(() => {
      setPerm(p);
      setStandalone(sa);
    });
  }, []);

  async function set(key: keyof Prefs, value: boolean) {
    setPrefs((x) => ({ ...x, [key]: value }));
    await api('/api/me', { method: 'PATCH', body: { [key]: value } });
    if (value && perm === 'default') await enable();
  }

  async function enable() {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPerm(result as Perm);
    if (result === 'granted') await subscribePush().catch(() => false);
  }

  const ios = typeof navigator !== 'undefined' && /iPhone|iPad/.test(navigator.userAgent);

  return (
    <>
      <TopBar back={{ href: '/profile' }} title="Notifications" />
      <div className={s.body}>
        <p className={s.intro}>Set when each regimen reminds you on the regimen itself. The toggles below control overall notification behavior.</p>
        <div className={s.card}>
          <Switch checked={prefs.notify_regimen_reminders} onChange={(v) => set('notify_regimen_reminders', v)} label="Regimen reminders" description="Get reminded when each regimen is due" />
          <Switch checked={prefs.notify_timer_alerts} onChange={(v) => set('notify_timer_alerts', v)} label="Wait timer alerts" description="Notify when a wait timer completes" />
          <Switch checked={prefs.notify_share_activity} onChange={(v) => set('notify_share_activity', v)} label="Activity on my shares" description="When someone copies one of your shared regimens" />
        </div>
        <div className={s.status} role="status">
          {!pushConfigured && <p>Push delivery isn&apos;t set up on this server yet. In-app alerts still work.</p>}
          {pushConfigured && perm === 'unsupported' && <p>{ios && !standalone ? 'On iPhone, add regi to your Home Screen (Share → Add to Home Screen) to get notifications.' : 'This browser doesn’t support push notifications.'}</p>}
          {pushConfigured && perm === 'default' && (
            <>
              <p>Allow notifications on this device so alerts reach you when regi is closed.</p>
              <Button variant="outline" size="sm" onClick={enable}>Allow notifications</Button>
            </>
          )}
          {pushConfigured && perm === 'denied' && <p>Notifications are blocked for regi in your browser settings.</p>}
          {pushConfigured && perm === 'granted' && <p>Notifications are on for this device.</p>}
        </div>
      </div>
    </>
  );
}
