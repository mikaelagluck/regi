'use client';
import { IconBottle, IconCalendarMonth, IconCheckbox, IconListCheck, IconUser, type Icon } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import s from './TabBar.module.css';

export const TABS: { root: string; label: string; icon: Icon }[] = [
  { root: '/products', label: 'Products', icon: IconBottle },
  { root: '/regimens', label: 'Regimens', icon: IconListCheck },
  { root: '/today', label: 'Today', icon: IconCheckbox },
  { root: '/calendar', label: 'Calendar', icon: IconCalendarMonth },
  { root: '/profile', label: 'Profile', icon: IconUser },
];

const KEY = (root: string) => `regi:tab:${root}`;

export function tabFor(pathname: string) {
  return TABS.find((t) => pathname === t.root || pathname.startsWith(`${t.root}/`));
}

// Remembered last screen per tab, read via useSyncExternalStore so SSR and hydration agree.
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
function snapshot(): string {
  try {
    return TABS.map((t) => sessionStorage.getItem(KEY(t.root)) ?? '').join('|');
  } catch {
    return '';
  }
}
function remember(root: string, href: string) {
  try {
    sessionStorage.setItem(KEY(root), href);
  } catch {
    /* storage unavailable — tabs just open at their root */
  }
  listeners.forEach((l) => l());
}

/**
 * B1.1/B1.2: five tabs, Today centre with a filled circle. Each tab remembers its last screen
 * (sessionStorage); tapping the active tab returns to its root.
 */
export function TabBar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const current = tabFor(pathname);

  const memory = useSyncExternalStore(subscribe, snapshot, () => '').split('|');

  useEffect(() => {
    if (!current) return;
    const q = search.toString();
    remember(current.root, q ? `${pathname}?${q}` : pathname);
  }, [current, pathname, search]);

  return (
    <nav className={s.bar} aria-label="Main">
      <ul className={s.list}>
        {TABS.map((t, i) => {
          const active = current?.root === t.root;
          const href = active ? t.root : memory[i] || t.root;
          const Icon = t.icon;
          const isToday = t.root === '/today';
          return (
            <li key={t.root} className={s.item}>
              <Link
                href={href}
                className={`${s.link} ${active ? s.active : ''} ${isToday ? s.today : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  if (active) remember(t.root, t.root);
                }}
              >
                <span className={s.icon}>
                  <Icon size={isToday ? 24 : 22} stroke={active ? 2 : 1.6} aria-hidden />
                </span>
                <span className={s.label}>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
