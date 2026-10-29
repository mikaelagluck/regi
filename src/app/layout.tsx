import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, Spectral } from 'next/font/google';
import { ServiceWorker } from '@/components/ServiceWorker';
import { color } from '@/styles/tokens.generated';
import '@/styles/globals.css';

const spectral = Spectral({
  subsets: ['latin'],
  weight: ['600', '700'],
  style: ['italic'],
  variable: '--font-spectral',
  display: 'swap',
});
const instrument = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'regi', template: '%s · regi' },
  description: 'Track your regimens. Keep your streak. Share what works.',
  applicationName: 'regi',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'regi', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: color.white,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spectral.variable} ${instrument.variable}`}>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <div className="app-column">{children}</div>
        <ServiceWorker />
      </body>
    </html>
  );
}
