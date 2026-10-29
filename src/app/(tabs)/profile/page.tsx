import { IconBell, IconChevronRight, IconShare2 } from '@tabler/icons-react';
import Link from 'next/link';
import { TopBar } from '@/components/atoms';
import { AccountActions } from '@/components/profile/AccountActions';
import { requireProfile } from '@/lib/auth/session';
import { asUser } from '@/lib/db';
import { compactNumber } from '@/lib/format';
import s from './profile.module.css';

export const metadata = { title: 'Profile' };

/** [profile-01] B8.1 — identity, lifetime stats, My Shares, Notifications, Sign out. */
export default async function ProfilePage() {
  const { profile } = await requireProfile();
  const stats = await asUser(profile.id, (tx) =>
    tx.one<{ regimens: number; products: number; active: number; views: number; copies: number }>(
      `select (select count(*)::int from regimens where not is_archived) as regimens,
              (select count(*)::int from user_products where state <> 'wishlist') as products,
              (select count(*)::int from share_artifacts where is_active) as active,
              (select coalesce(sum(view_count), 0)::int from share_artifacts) as views,
              (select coalesce(sum(copy_count), 0)::int from share_artifacts) as copies`,
    ),
  );
  const name = profile.display_name ?? profile.username;
  return (
    <>
      <TopBar large title="Profile" />
      <div className={s.body}>
        <section className={s.identity}>
          <span className={s.avatar} aria-hidden>
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" />
            ) : (
              name[0]?.toUpperCase()
            )}
          </span>
          <h2 className={s.name}>{name}</h2>
          <p className="t-caption">@{profile.username}</p>
        </section>

        <dl className={s.stats}>
          <div><dt>Day streak</dt><dd>{profile.current_streak_days}</dd></div>
          <div><dt>Regimens</dt><dd>{profile.lifetime_regimens_completed}</dd></div>
          <div><dt>Products</dt><dd>{stats?.products ?? 0}</dd></div>
        </dl>

        <nav className={s.rows} aria-label="Profile">
          <Link href="/profile/shares" className={s.row}>
            <span className={s.shareIcon}><IconShare2 size={16} aria-hidden /></span>
            <span className={s.rowText}>
              <span className={s.rowLabel}>My shares</span>
              <span className="t-caption">{stats?.active ?? 0} active · {compactNumber(stats?.views ?? 0)} views · {compactNumber(stats?.copies ?? 0)} copies</span>
            </span>
            <IconChevronRight size={16} aria-hidden className={s.chev} />
          </Link>
          <Link href="/profile/notifications" className={s.row}>
            <IconBell size={18} aria-hidden />
            <span className={s.rowText}><span className={s.rowLabel}>Notifications</span></span>
            <IconChevronRight size={16} aria-hidden className={s.chev} />
          </Link>
        </nav>

        <AccountActions username={profile.username} />
      </div>
    </>
  );
}
