import { ImageResponse } from 'next/og';
import { TIME_OF_DAY_LABEL } from '@/lib/schedule';
import { loadPublicShare } from '@/lib/server/publicShare';
import { color } from '@/styles/tokens.generated';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'A regimen shared on regi';

/** Social preview: yellow band (sharing), regimen name, creator, step count. */
export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const share = await loadPublicShare((await params).slug);
  const name = share?.regimen?.name ?? 'A regimen on regi';
  const meta = share?.regimen ? `@${share.creator.username} · ${TIME_OF_DAY_LABEL[share.regimen.time_of_day]} · ${share.steps?.length ?? 0} steps` : 'regi';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: color.white }}>
        <div style={{ height: 28, background: color.yellow, display: 'flex' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 90px', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: 40, color: color.inkTertiary }}>{meta}</div>
          <div style={{ display: 'flex', fontSize: 92, fontWeight: 700, fontStyle: 'italic', color: color.ink, lineHeight: 1.05 }}>{name}</div>
          {share?.description && <div style={{ display: 'flex', fontSize: 34, color: color.inkSecondary }}>“{share.description.slice(0, 110)}”</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', padding: '0 90px 60px', fontSize: 64, fontWeight: 700, fontStyle: 'italic' }}>
          <span style={{ color: color.pink }}>*</span>
          <span style={{ color: color.ink }}>regi</span>
        </div>
      </div>
    ),
    size,
  );
}
