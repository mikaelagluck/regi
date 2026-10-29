import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PGlite (local Postgres in WASM) and pg must stay as real Node modules.
  serverExternalPackages: ['@electric-sql/pglite', 'pg', 'web-push'],
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
