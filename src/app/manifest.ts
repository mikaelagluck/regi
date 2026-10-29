import type { MetadataRoute } from 'next';
import { color } from '@/styles/tokens.generated';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'regi',
    short_name: 'regi',
    description: 'Track your regimens. Keep your streak. Share what works.',
    id: '/today',
    start_url: '/today',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: color.white,
    theme_color: color.white,
    categories: ['health', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
