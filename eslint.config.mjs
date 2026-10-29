import next from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...next,
  ...nextTs,
  {
    ignores: ['.next/**', 'node_modules/**', 'design/**', 'public/sw.js', 'playwright-report/**', 'test-results/**', '.data/**', 'next-env.d.ts', 'supabase/functions/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];

export default config;
