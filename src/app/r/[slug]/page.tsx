import { IconCopy, IconExternalLink } from '@tabler/icons-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Fragment, Suspense } from 'react';
import { ButtonLink, Logo, StepRow, WaitStrip } from '@/components/atoms';
import { PendingWishlist, TrackView, WishlistButton } from '@/components/share/ShareClient';
import s from '@/components/share/SharePage.module.css';
import { compactNumber } from '@/lib/format';
import { formatMonthDay } from '@/lib/logicalDate';
import { TIME_OF_DAY_LABEL } from '@/lib/schedule';
import { loadPublicShare } from '@/lib/server/publicShare';
import { STEP_TYPE_LABEL } from '@/lib/stepTypes';
import { formatWait } from '@/lib/timer';

// Public, unauthenticated, CDN-cacheable (C5.3: 60s).
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const share = await loadPublicShare((await params).slug);
  if (!share || share.entity_type !== 'regimen') return { title: 'Link not active', robots: { index: false } };
  const title = `${share.regimen!.name} — @${share.creator.username}'s regimen`;
  const description = share.description ?? `${TIME_OF_DAY_LABEL[share.regimen!.time_of_day]} · ${share.steps!.length} steps. View it and copy it to your regimens on regi.`;
  return {
    title,
    description,
    robots: { index: false, follow: false }, // v1 shares are unlisted (C8)
    openGraph: { title, description, type: 'article', siteName: 'regi' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function Gone() {
  return (
    <main id="main" className={s.gone}>
      <Logo size="card" />
      <h1 className="t-headline">This link isn&apos;t active anymore</h1>
      <p className="t-caption">The person who shared it may have turned it off.</p>
      <ButtonLink href="/today" variant="outline">Open regi</ButtonLink>
    </main>
  );
}

/** [share-view] B7.2 — yellow = sharing. Journal and product notes never appear (C6.2). */
export default async function ShareRegimenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const share = await loadPublicShare(slug);
  if (!share || share.entity_type !== 'regimen') return <Gone />;
  const steps = share.steps ?? [];
  const initial = (share.creator.display_name ?? share.creator.username)[0]?.toUpperCase();

  return (
    <main id="main" className={s.page}>
      <TrackView slug={slug} />
      <Suspense><PendingWishlist slug={slug} /></Suspense>
      <div className={s.band} aria-hidden />
      <div className={s.top}>
        <Link href="/today" aria-label="regi home"><Logo /></Link>
        <span className={s.tag}>Shared regimen</span>
      </div>

      <header className={s.creator}>
        <span className={s.avatar} aria-hidden>
          {share.creator.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={share.creator.avatar_url} alt="" />
          ) : (
            initial
          )}
        </span>
        <span className={s.handle}>@{share.creator.username}&apos;s regimen</span>
        <h1 className={s.name}>{share.regimen!.name}</h1>
        <span className={s.sub}>{TIME_OF_DAY_LABEL[share.regimen!.time_of_day]} · {steps.length} step{steps.length === 1 ? '' : 's'}</span>
      </header>

      {share.description && <blockquote className={s.quote}>“{share.description}”</blockquote>}

      <dl className={s.stats}>
        <div><dt>Views</dt><dd>{compactNumber(share.view_count)}</dd></div>
        <div><dt>Copies</dt><dd>{compactNumber(share.copy_count)}</dd></div>
        <div><dt>Shared</dt><dd>{formatMonthDay(share.created_at.slice(0, 10))}</dd></div>
      </dl>

      <ol className={s.steps}>
        {steps.map((st, i) => (
          <Fragment key={st.id}>
            <li>
              <StepRow
                lead="number"
                index={i}
                title={st.label}
                subtitle={[STEP_TYPE_LABEL[st.step_type], st.brand].filter(Boolean).join(' · ')}
                trailing={
                  <span className={s.chips}>
                    {st.brand && st.product_name && <WishlistButton slug={slug} stepId={st.id} label={st.label} />}
                    {st.affiliate_url && (
                      <a href={`/api/public/r/${slug}/out?step=${st.id}`} target="_blank" rel="noopener noreferrer nofollow sponsored" className={s.chip} aria-label={`Link to ${st.label} (opens in a new tab)`}>
                        Link <IconExternalLink size={12} aria-hidden />
                      </a>
                    )}
                  </span>
                }
              />
            </li>
            {st.wait_seconds_after > 0 && i < steps.length - 1 && (
              <li><WaitStrip>Wait {formatWait(st.wait_seconds_after)}</WaitStrip></li>
            )}
          </Fragment>
        ))}
      </ol>

      <div className={s.cta}>
        <ButtonLink href={`/r/${slug}/copy`} variant="share" block icon={<IconCopy size={16} aria-hidden />} prefetch={false}>
          Copy to my regimens
        </ButtonLink>
        <p className={s.hint}>Adds it to your regimens. Use it as-is or edit it for your needs.</p>
      </div>

      <footer className={s.footer}>
        New to regi? <Link href="/welcome" className="t-link">Get started</Link>
      </footer>
    </main>
  );
}
