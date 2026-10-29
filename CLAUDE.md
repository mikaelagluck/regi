# CLAUDE.md — regi

Persistent instructions for Claude Code. Read this whole file before doing anything, and re-read it at the start of every phase.

## What regi is
A mobile-first web app for tracking skincare regimens: Products (what you own) → Regimens (ordered step templates) → Schedule (when they run) → Today (do it, check it off). v1 success = a polished, installable web app with a satisfying daily loop. Target user already knows skincare — **tool, not teacher**.

**Platform change:** the PRD was written for native iOS (SwiftUI). This build is a **web app (installable PWA)** instead. Keep all product behaviour, data model, algorithms and copy from the PRD; translate iOS-specific items using the table under "Platform translation" below.

## Source files (in priority order)
1. `CLAUDE.md` (this file) — including **Platform translation** and **Resolved conflicts**, which override everything else.
2. `docs/PRD_v3.0.md` — behaviour, copy, data model, algorithms, API. Part A = product, Part B = UX (screen IDs in brackets), Part C = backend.
3. `design/tokens.md` + `design/Regi-moodboard.html` — **all visual styling**: colour, type, logo.
4. `design/Regi_Wireframes.html` — **layout, hierarchy and copy only**. Every screen has an ID matching PRD Part B (e.g. `today-01`). Ignore its colours.
5. `docs/BUILD_APPROACH.md` — phase plan and tactics (its iOS-specific advice is superseded by this file).

Before building any screen: open the wireframe section with that screen's ID and the matching PRD section. Never guess a layout.

## Stack (fixed — don't substitute)
- **App:** Next.js (App Router) + TypeScript + React. One codebase serves the app, the REST API (route handlers under `/api`), and the public share pages.
- **Styling:** CSS variables generated from `design/tokens.md` (`src/styles/tokens.css`) + CSS Modules or Tailwind configured to read only those variables. Fonts via `next/font/google` (Spectral, Instrument Sans). Icons: `@tabler/icons-react`.
- **DB/Auth/Storage:** Supabase — Postgres with RLS on every table, migrations via Supabase CLI committed to `supabase/migrations/`. `@supabase/ssr` for auth in Next.js.
- **Recurrence:** `rrule`. **Dates:** `date-fns` + `date-fns-tz`.
- **Tests:** Vitest for logic; Playwright for the core flows.
- **PWA:** web app manifest, icons, service worker (offline shell), installable on iOS and Android.

## Repo layout
```
src/app/            routes: (auth), (tabs)/today|products|regimens|calendar|profile, r/[slug], p/[slug], api/*
src/components/     atoms + composed components
src/lib/            logicalDate, schedule resolution, streaks, supabase clients
src/styles/         tokens.css, globals.css
supabase/           config, migrations, seed (categories)
tests/              vitest + playwright
design/  docs/      read-only reference
PROGRESS.md  DECISIONS.md   you maintain these
```

## Platform translation (PRD iOS → web)
| PRD says | Build this |
|---|---|
| Swift/SwiftUI frontend, separate Node API | Next.js app with `/api` route handlers (same REST surface as PRD C4) |
| Separate Next.js share-view codebase | Same app: public routes `/r/[slug]`, `/p/[slug]` (server-rendered, Open Graph, cacheable) |
| Universal Links / deep linking (B7.3, C1.3) | Not needed. "Copy to my regimens" on the share page: signed in → copy and go to the new regimen; signed out → sign in/up, then complete the copy (preserve the slug through auth). "Get the app" → "Open regi" / sign up. |
| Bottom tab bar, modals, pushes, bottom sheets | Fixed bottom nav (respect `env(safe-area-inset-bottom)`), full-screen modal routes for creation flows, normal route pushes for drill-down, accessible bottom-sheet component (focus trap, Esc, swipe-down on touch, 4×36 handle) |
| APNs push / local notifications | Web Push via service worker (works for installed PWAs incl. iOS 16.4+). Wait-timer completion: in-app alert always; push if permission granted. Regimen reminders: Supabase scheduled function sending Web Push. Stub behind env config if keys absent. |
| Sign in with Apple mandatory (App Store rule) | Not mandatory on web. Ship **Google + email (magic link)**; add Apple behind config if keys are provided. |
| SwiftUI previews | Storybook-free: a dev-only `/dev/atoms` and `/dev/screens` gallery showing each atom/screen in empty, populated and edge states |
| Phone layout | Design for 390px width (wireframe width). On wider screens, centre the app in a max-width ~480px column; don't build a desktop layout. |

## Non-negotiable rules
- **Tokens first, atoms second, screens third.** `tokens.css` and the atom library (`Button`, `Card`, `Checkbox`, `Chip`, `Pill`, `BottomSheet`, `StepRow`, `StreakCard`, `EmptyState`, `ProgressFill`, `TabBar`, `Logo`) exist before any feature screen. Screens compose atoms; no raw hex values or font names anywhere outside `tokens.css`.
- **Colour means something.** Pink = active, blue = informational, yellow = sharing, on pure white. Every coloured state also has a non-colour cue.
- **History is inviolate.** Never mutate past `regimen_instances` / `regimen_step_instances`. Edits from Today go through the edit-scope sheet (B5.6).
- **Logical date = (now − 4h) in the user's local timezone** (store the user's IANA timezone on their profile; the client sends it). One shared helper in `src/lib`, used by both server and client, with tests for DST transitions (3:59am on spring-forward and fall-back days) and the midnight–4am window.
- **RRULE resolution and streak math get tests** before UI depends on them.
- **Wait timers derive from `timer_started_at`**, never from a ticking counter: fill width and countdown are computed from start time + duration (CSS animation with negative `animation-delay`, or `requestAnimationFrame` reading the clock). Reloading the page shows the true position.
- **Use "regimen" in all user-facing copy.** Never "routine".
- **RLS does authorization.** No app-level ownership checks duplicating it. Service-role key only on the server, never shipped to the client.
- Mobile ergonomics: 44px minimum tap targets, no hover-only affordances, `prefers-reduced-motion` respected (success animation and timer fill degrade gracefully).

## Resolved conflicts (these override the PRD and wireframes)
Apply these defaults; if you hit a new conflict, pick the option most consistent with the rules above and log it in `DECISIONS.md`.

| # | Conflict | Resolution |
|---|---|---|
| 1 | Wireframes use a warm beige/amber palette; moodboard uses CMY on white | **Moodboard/tokens win** for all visuals. Wireframes = layout only. |
| 2 | PRD says "primary color" (active tab, active pill, selected weekday, timer fill, CTAs) | Primary = **pink**. |
| 3 | PRD B3.2: flame icon "amber accent" | No amber exists. Flame + number in **ink**; a **blue** icon tint is allowed (informational). Log as DECISION for Mikaela to confirm. |
| 4 | PRD B2.1: username "green Available" | No green. **Blue** text + check icon. Taken state: ink text + × icon + "Taken". |
| 5 | Destructive actions (Sign out, Remove from regimen) — no red in palette | Ink text, weight 500, always behind a confirmation sheet. Log as DECISION. |
| 6 | PRD B5.3 labels the builder field "Routine name" | Use **"Regimen name"** (PRD A3 terminology rule). |
| 7 | PRD copy writes "Regi"; brand mark is `*regi` | Logo wherever it appears as a mark; lowercase **"regi"** in running copy. |
| 8 | Regimens list "Shared" tab "groups by recipient name" is ambiguous | Treat "Shared" as regimens whose `target_user_label` is set, grouped by that label. Log as DECISION. |
| 9 | Account deletion "out of scope for v1" | **Build it** in Phase 4 (Profile → Delete account, confirmation sheet; server deletes user data + auth user). |
| 10 | Product share (`/p/`) and product-list share (`/s/`) have no UX spec | Regimen shares fully. Product share: Share on product detail creates a `/p/` link showing brand, name, category, rating, affiliate link. Skip `/s/`. |

## Things you cannot do — stop and ask only for these
Use placeholders/env vars (`.env.example` documents every one), keep building against local Supabase (`supabase start`), and list them in `PROGRESS.md` under **Needs Mikaela**:
- Hosted Supabase project URL / anon key / service-role key
- Google OAuth client ID/secret; email (SMTP) provider for magic links in production
- VAPID keys for Web Push (you can generate dev keys yourself)
- Hosting (Vercel default) and the production domain

Everything else: make the call, log it, keep going.

## PROGRESS.md (you maintain)
Update at the end of every phase and before stopping for any reason:
- Screen inventory (wireframe IDs ↔ PRD sections ↔ routes) with ✅ / 🟡 / ⬜
- What runs and how (exact commands)
- Test status
- **Needs Mikaela** — credentials/config blocking anything
- **Next step** — precise enough that "continue from PROGRESS.md" resumes cleanly

## DECISIONS.md (you maintain)
One line per judgment call: what was ambiguous, what you chose, which file/screen. Mikaela reviews this.

## Definition of done per phase
- `npm run build`, `npm run lint`, `npm test` all pass; Playwright flow for the phase passes
- Screens match wireframe layout and token styling at 390px; dev gallery updated
- Committed with a message naming the phase
