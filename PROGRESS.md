# regi — PROGRESS

Status legend: ✅ built & checked at 390px · 🟡 partial · ⬜ not started

## Screen inventory

| # | Wireframe ID | PRD Part B | Route | Phase | Status |
|---|---|---|---|---|---|
| 1 | `nav-01` | B1.1–B1.4 | `TabBar` atom in `src/app/(tabs)/layout.tsx` | 0 | ✅ |
| 2 | `signup-01` | B2.1 screen 1 | `/welcome` | 0 | ✅ |
| 3 | `signup-02` | B2.1 screen 2 | `/welcome/username` | 0 | ✅ |
| 4 | `empty-today` | B2.2 | `/today` (no scheduled regimens) | 1 | ✅ |
| 5 | `empty-products` | B2.2 | `/products` (no products) | 1 | ✅ |
| 6 | `empty-calendar` | B2.2 | `/calendar` (no history) | 1 | ✅ |
| 7 | `today-01` | B3.1–B3.5, B3.9 | `/today`, `/today?date=YYYY-MM-DD` | 1 | ✅ |
| 8 | `timer-states` | B3.6–B3.7 | `/today` (StepRow timer state + skip-wait sheet) | 1 | ✅ |
| 9 | `success-moment` | B3.8 | `/today` overlay | 2 | ✅ |
| 10 | `products-01` | B4.1–B4.3, B4.5 | `/products?state=using` | 1 | ✅ |
| 11 | `products-filter` | B4.4 | `/products` bottom sheet | 1 | ✅ |
| 12 | `empty-product-modal` | B4.6 | `/products/[id]/finish` (full-screen modal) | 2 | ✅ |
| 13 | `product-detail` | B4.7 | `/products/[id]` | 1 | ✅ |
| — | (add/edit product, no wireframe) | B4.8 | `/products/new`, `/products/[id]/edit` | 1 | ✅ |
| 14 | `regimens-01` | B5.1 | `/regimens?folder=mine|shared` | 1 | ✅ |
| 15 | `regimen-detail` | B5.2 | `/regimens/[id]` | 1 | ✅ |
| 16 | `regimen-builder-empty` | B5.3 (empty) | `/regimens/new` | 1 | ✅ |
| 17 | `regimen-builder-01` | B5.3 | `/regimens/new`, `/regimens/[id]/edit` | 1 | ✅ |
| 18 | `step-editor` | B5.4, B9.3 | builder sub-screen (in-flow full-screen panel) | 1 | ✅ |
| 19 | `regimen-builder-schedule-recurring` | B5.5 recurring, C3.5 | `/regimens/[id]/schedule` | 1 | ✅ |
| 20 | `regimen-builder-schedule-range` | B5.5 date range | `/regimens/[id]/schedule?mode=range` | 1 | ✅ |
| 21 | `edit-scope` | B5.6 | `/today` bottom sheet | 1 | ✅ |
| 22 | `calendar-month` | B6.2–B6.4, B9.4 | `/calendar?view=month` (Day view = `/calendar?view=day`, B6.1) | 2 | ✅ |
| 23 | `share-create` | B7.1 | `/share/new?type=regimen&id=…` | 3 | ✅ |
| 24 | `share-view` | B7.2, B7.4, B7.5 | `/r/[slug]` (public, SSR, OG); product: `/p/[slug]` | 3 | ✅ |
| 25 | `profile-01` | B8.1 | `/profile` | 0/4 | ✅ |
| 26 | `my-shares` | B8.2 | `/profile/shares`, drilldown `/profile/shares/[id]` | 3 | ✅ |
| 27 | `notifications` | B8.3 | `/profile/notifications` | 4 | ✅ |
| — | Archive surface (no wireframe) | B5.1 "Archived (N)" | `/regimens/archived` | 4 | ✅ |
| — | Account deletion (no wireframe; CLAUDE.md conflict #9) | — | `/profile` → confirmation sheet | 4 | ✅ |
| — | Dev galleries | CLAUDE.md | `/dev/atoms`, `/dev/screens` | 0 | ✅ |

## What runs and how
```bash
export PATH="$HOME/.local/node/bin:$PATH"   # Node 24 was installed here (machine had none)
npm install
npm run dev            # http://localhost:3000 — local Postgres (PGlite) + dev sign-in, no Docker needed
npm test               # Vitest: logic + migrations/RLS against real Postgres (PGlite)
npm run test:e2e       # Playwright (builds, then runs next start on :3100 with a fresh DB)
npm run lint && npm run build
```

## Test status
- Phase 0: Vitest 74/74 ✅ · Playwright auth 2/2 ✅ · lint ✅ · build ✅
- Phase 4: Vitest 77/77 ✅ · Playwright 14/14 ✅ (adds axe a11y on 15 screens, sheet focus trap/Esc, edit-scope, reduced motion, account deletion, PWA manifest/icons/SW) · Lighthouse /welcome mobile: Perf 94 · A11y 100 · Best practices 100 · SEO 100 (Lighthouse 12 has no PWA category; installability covered by E2E)
- Phase 3: Vitest 75/75 ✅ · Playwright sharing 2/2 ✅ (create link, SSR + OG, signed-out copy through sign-in, wishlist, view/copy/click tracking, revoke, /p/ page)
- Phase 2: Playwright tracking 3/3 ✅ (calendar dots + retro marker, streak/rollover cron + Day N, finish → history/repurchase)
- Phase 1: Vitest 74/74 ✅ · Playwright 3/3 ✅ (solo MVP flow: sign up → 5 products → morning regimen → complete incl. timer + skip-wait + success → next logical day reappears → missed day resets streak) · lint ✅ · build ✅

## Deployment
- Live: https://www.regi.skin (apex regi.skin → www; also https://regi-lilac.vercel.app). Vercel project `regi`, GitHub `mikaelagluck/regi`, Supabase project `kkwzmodanutsdfhuqrys`.
- All 6 migrations applied on hosted Supabase (`supabase db push`), so they're validated on real Supabase. Email magic-link sign-in works end to end.

## Needs Mikaela
- Supabase Cron: enable `pg_cron` + `pg_net`, then run `select public.regi_schedule_jobs('https://www.regi.skin', '<CRON_SECRET>');` (streak rollover + push sending).
- Custom SMTP provider in Supabase (built-in sender is rate-limited; fine for testing only).
- Google OAuth client (then set `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true` in Vercel and redeploy).
- Terms / Privacy copy (placeholder pages at /terms, /privacy).
- Docker Desktop is now optional (only for running Supabase locally).

## Next step
Supabase Cron, then SMTP, then Google sign-in.
