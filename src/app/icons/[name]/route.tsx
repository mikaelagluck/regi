import { ImageResponse } from 'next/og';
import { color } from '@/styles/tokens.generated';

const SIZES: Record<string, { size: number; pad: number }> = {
  'icon-192.png': { size: 192, pad: 0.22 },
  'icon-512.png': { size: 512, pad: 0.22 },
  'maskable-512.png': { size: 512, pad: 0.32 },
  'apple-touch-icon.png': { size: 180, pad: 0.24 },
  'favicon-32.png': { size: 32, pad: 0.1 },
};

export function generateStaticParams() {
  return Object.keys(SIZES).map((name) => ({ name }));
}

/** App icon: the logo's pink asterisk on white (drawn as shapes so no font file is needed). */
export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const cfg = SIZES[name];
  if (!cfg) return new Response('Not found', { status: 404 });
  const { size, pad } = cfg;
  const arm = size * (1 - pad * 2);
  const thickness = Math.max(3, arm * 0.17);
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, background: color.white, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {[0, 60, 120].map((deg) => (
          <div
            key={deg}
            style={{
              position: 'absolute',
              width: thickness,
              height: arm,
              borderRadius: thickness,
              background: color.pink,
              transform: `rotate(${deg + 15}deg)`,
            }}
          />
        ))}
      </div>
    ),
    { width: size, height: size },
  );
}
