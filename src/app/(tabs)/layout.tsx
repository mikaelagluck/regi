import { Suspense } from 'react';
import { TabBar } from '@/components/atoms';
import { TimezoneSync } from '@/components/app/TimezoneSync';
import { requireProfile } from '@/lib/auth/session';
import s from './tabs.module.css';

export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();
  return (
    <>
      <main id="main" className={s.main}>
        {children}
      </main>
      <Suspense>
        <TabBar />
      </Suspense>
      <TimezoneSync current={profile.timezone} />
    </>
  );
}
