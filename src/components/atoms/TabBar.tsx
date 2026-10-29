'use client';
import { IconBottle, IconCalendarMonth, IconCheckbox, IconListCheck, IconUser, type Icon } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
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

function read(root: string): string | null {
  try {
    return sessionStorage.getItem(KEY(root));
  } catch {
    return null;
  }
}

/**
 * B1.1/B1.2: five tabs, Today centre with a filled circle. Each tab remembers its last screen
 * (sessionStorage); tapping the active tab returns to its root.
 */
export function TabBar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const current = tabFor(pathname);

  useEffect(() => {
    if (!current) return;
    const q = search.toString();
    try {
      sessionStorage.setItem(KEY(current.root), q ? `${pathname}?${q}` : pathname);
    } catch {
      /* storage unavailable — tabs just open at their root */
    }
  }, [current, pathname, search]);

  return (
    <nav className={s.bar} aria-label="Main">
      <ul className={s.list}>
        {TABS.map((t) => {
          const active = current?.root === t.root;
          const href = active ? t.root : (read(t.root) ?? t.root);
          const Icon = t.icon;
          const isToday = t.root === '/today';
          return (
            <li key={t.root} className={s.item}>
              <Link
                href={href}
                className={`${s.link} ${active ? s.active : ''} ${isToday ? s.today : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  if (active) {
                    try {
                      sessionStorage.setItem(KEY(t.root), t.root);
                    } catch {}
                  }
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
