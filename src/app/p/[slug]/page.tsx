import { IconExternalLink } from '@tabler/icons-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ButtonLink, Logo, Stars, StepTypeIcon } from '@/components/atoms';
import { PendingWishlist, TrackView, WishlistButton } from '@/components/share/ShareClient';
import s from '@/components/share/SharePage.module.css';
import { hostname } from '@/lib/format';
import { loadPublicShare } from '@/lib/server/publicShare';
import { STEP_TYPE_LABEL } from '@/lib/stepTypes';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const share = await loadPublicShare((await params).slug);
  if (!share?.product) return { title: 'Link not active', robots: { index: false } };
  const title = `${share.product.brand} ${share.product.name} — shared by @${share.creator.username}`;
  const description = share.description ?? `${share.product.category} · on regi`;
  return { title, description, robots: { index: false, follow: false }, openGraph: { title, description, siteName: 'regi' }, twitter: { card: 'summary', title, description } };
}

/** Product share (CLAUDE.md conflict #10): brand, name, category, rating, affiliate link. */
export default async function ShareProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const share = await loadPublicShare(slug);
  if (!share?.product) {
    return (
      <main id="main" className={s.gone}>
        <Logo size="card" />
        <h1 className="t-headline">This link isn&apos;t active anymore</h1>
        <ButtonLink href="/today" variant="outline">Open regi</ButtonLink>
      </main>
    );
  }
  const p = share.product;
  const host = hostname(p.affiliate_url);
  return (
    <main id="main" className={s.page}>
      <TrackView slug={slug} />
      <Suspense><PendingWishlist slug={slug} /></Suspense>
      <div className={s.band} aria-hidden />
      <div className={s.top}>
        <Link href="/today" aria-label="regi home"><Logo /></Link>
        <span className={s.tag}>Shared product</span>
      </div>
      <section className={s.product}>
        <div className={s.productMedia}>
          {p.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_url} alt="" />
          ) : (
            <StepTypeIcon type={p.step_type} size={40} />
          )}
        </div>
        <span className={s.handle}>@{share.creator.username} recommends</span>
        <span className="t-overline">{p.brand}</span>
        <h1 className={s.name}>{p.name}</h1>
        <span className={s.sub}>{p.category} · {STEP_TYPE_LABEL[p.step_type]}</span>
        <Stars value={p.star_rating} size={16} />
      </section>
      {share.description && <blockquote className={s.quote}>“{share.description}”</blockquote>}
      <div className={s.cta}>
        <WishlistButton slug={slug} label={`${p.brand} ${p.name}`} variant="button" />
        {host && (
          <a href={`/api/public/r/${slug}/out`} target="_blank" rel="noopener noreferrer nofollow sponsored" className="t-link">
            Where to buy · {host} <IconExternalLink size={12} aria-hidden />
          </a>
        )}
      </div>
      <footer className={s.footer}>
        New to regi? <Link href="/welcome" className="t-link">Get started</Link>
      </footer>
    </main>
  );
}
