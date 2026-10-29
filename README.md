# *regi

Mobile-first skincare regimen tracker — installable PWA. Next.js (App Router) + Supabase.
Specs: `CLAUDE.md` (rules, iOS→web translation), `docs/PRD_v3.0.md`, `design/`. Status: `PROGRESS.md`. Judgment calls: `DECISIONS.md`.

## Run locally (no Docker, no accounts needed)
```bash
export PATH="$HOME/.local/node/bin:$PATH"   # if Node isn't on your PATH (Node 20+)
npm install
npm run dev        # http://localhost:3000
```
With no Supabase env vars set, the app uses an in-process Postgres (PGlite, data in `.data/`) with the real
migrations, and dev sign-in: "Continue with email" shows an **Open magic link (dev)** button.
`npm run db:reset` wipes the local database. Dev-only galleries: `/dev/atoms`, `/dev/screens`.

## Tests
```bash
npm test           # Vitest: logicalDate/DST, schedule resolver, streaks, timers + migrations & RLS on real Postgres
npm run test:e2e   # Playwright: builds, runs `next start` on :3100 with a fresh DB (first run: npx playwright install chromium)
npm run lint && npm run typecheck && npm run build
```

## Deploy (Supabase + Vercel)
1. **Supabase** — create a project (separate from any other app), then:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push            # applies supabase/migrations (schema, RLS, categories, storage bucket)
   ```
   - Auth → URL configuration: Site URL `https://<domain>`, redirect `https://<domain>/auth/callback`.
   - Auth → Providers: enable Google (client ID/secret); Auth → SMTP: your email provider for magic links.
   - Scheduled jobs use Supabase Cron (works on Vercel's free plan): enable the `pg_cron` + `pg_net` extensions, then
     run `select public.regi_schedule_jobs('https://<domain>', '<CRON_SECRET>');` in the SQL editor.
2. **Vercel** — import the GitHub repo, set every variable in `.env.example`
   (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `DATABASE_URL` = Supabase "Transaction pooler" string, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
   `VAPID_SUBJECT`, `CRON_SECRET`). Leave `ALLOW_DEV_AUTH` / `ALLOW_TIME_TRAVEL` unset. Deploy.
3. Generate production VAPID keys with `npm run gen:vapid`.
