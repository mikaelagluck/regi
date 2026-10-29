# regi — DECISIONS

One line per judgment call: what was ambiguous → what I chose (where). ★ = worth Mikaela's review.

## Platform & infrastructure
- ★ **No Docker on this machine → local Supabase (`supabase start`) can't run.** Local dev and tests use **PGlite** (real Postgres 18 compiled to WASM, in-process) with the *same* `supabase/migrations/*.sql`, preceded by `supabase/local-shim.sql` (roles + `auth.users` + `auth.uid()`). Production uses hosted Supabase. Migrations are written for Supabase and guard Supabase-only bits (storage, pg_cron). (`src/lib/db/pglite.ts`)
- ★ **Data access = direct Postgres with RLS, not supabase-js/PostgREST.** Every user request runs in a transaction that does `set local role authenticated` + `request.jwt.claims.sub = <user>` — exactly what PostgREST does — so RLS remains the only authorization layer. Lets the same code run on PGlite locally and Supabase (`DATABASE_URL`, transaction pooler) in production, and gives one-round-trip Today loads. Supabase is still used for Auth (`@supabase/ssr`) and Storage. (`src/lib/db/*`)
- ★ **Dev sign-in when Supabase isn't configured:** "Continue with email" issues a signed, 15-minute link shown on screen ("Open magic link (dev)") that mirrors the real magic-link flow; session = HMAC-signed httpOnly cookie. Disabled automatically when `NEXT_PUBLIC_SUPABASE_URL` is set, and on production builds unless `ALLOW_DEV_AUTH=1` (used only by Playwright). (`src/lib/auth/*`)
- Installed Node 24 LTS to `~/.local/node` (machine had no Node); did not edit shell profiles. Supabase CLI runs via `npx supabase` (npm devDependency).
- Next.js 16 renamed middleware → `src/proxy.ts`; it only refreshes the Supabase session cookie and is a no-op in dev mode.
- Test-only time travel: `regi_time_offset` cookie shifts the server clock when `ALLOW_TIME_TRAVEL=1` (or plain `next dev` without Supabase). Used by Playwright to "advance the logical day". (`src/lib/server/clock.ts`, `/api/dev/time`)

## Data model additions (beyond PRD C2)
- `users.timezone` (requested), `users.streak_evaluated_on` (rollover idempotency), `users.notify_*` ×3 (B8.3 toggles).
- `users.username` is nullable between auth signup and [signup-02]; app pages redirect to the username screen until set; it can only be set once (`claim_username()`), never edited.
- ★ **`regimen_steps.active_from` / `active_until` — copy-on-write step versioning.** Without it, editing a template would change how past days render (past days with no interaction render lazily from the template). Edits to a step that already applied to earlier days end-date the old row and insert a new one from today. Reordering is applied in place (order drift in history is accepted). (`src/lib/server/regimens.ts`)
- ★ **Schedules are end-dated, not rewritten.** Saving a schedule (and the C3.5 silent conflict swap) sets `end_date = yesterday` on assignments that already ran and inserts replacements starting today, so past days still resolve to what was actually scheduled. (`src/lib/schedule.ts`, tested)
- `regimen_step_instances.override_step_type` / `override_wait_seconds` for steps added/edited for one day.
- `regimen_steps.reference_url`: keeps the source affiliate URL on copied steps (B7.4 "preserved as viewable reference").
- `share_artifacts.revoked_at` for "revoked Mar 12" in [my-shares]; `share_views` table dedupes view counting per anonymous viewer per day ("rate-limited", C4.6).
- `push_subscriptions` and `scheduled_notifications` tables for Web Push (timer, reminder, share activity).
- Category reference data lives in a migration (prod needs it), not only `seed.sql`. 27 categories across all 9 step types.

## Security / privacy
- ★ **Shares are not publicly SELECT-able.** C6.1 says share_artifacts are "publicly readable when active"; a table-level public policy would let anyone enumerate every unlisted share via PostgREST. Public access is via `public_share(slug)` (SECURITY DEFINER), which requires the slug and returns only public fields — never journal notes or product notes (C6.2). Covered by tests.
- Users can't write their own counters (column-level grants); streak/lifetime/share counters are written server-side only.
- RLS `with check` also verifies referenced regimens/products belong to the caller (prevents attaching rows to someone else's regimen id). Tested.
- Product photos bucket is public-read with unguessable `<uid>/<uuid>.ext` paths; writes restricted to the owner's folder.

## Algorithms
- ★ **logicalDate applies the 4am cutoff to the local wall clock** (local hour < 4 → previous date) rather than subtracting 4 absolute hours. The literal "(now − 4h)" is wrong on DST days (e.g. at 4:00am on spring-forward day it would still return yesterday). Tests cover 3:59/4:00 on US and EU spring-forward and fall-back days. (`src/lib/logicalDate.ts`)
- Streak "perfect day" = every regimen scheduled that day completed. Days with nothing scheduled neither break nor extend a streak. An in-progress today doesn't break it; a skip today does (C3.3).
- Streak counter is **recomputed from history on every write that can change it** (check/uncheck/skip, incl. retroactive logging) and at rollover, then stored — reads stay O(1). This makes retroactive logging repair streaks correctly. Lookback 730 days.
- Lifetime regimens completed also **decrements** if a completed regimen is un-completed (otherwise uncheck/recheck double-counts).
- Schedule resolution tie-break (same priority): most recently created assignment wins.
- `started_on` auto-defaults to the first logged use (C2.4).

## UX
- Builder keeps showing the remaining scaffold slots (dashed) after the first step is added, and new scaffold steps slot into canonical order (Cleanse → Treat → Moisturize → Protect); B5.3 only describes the fully-empty state.
- "Add step" (non-empty builder) opens the step editor directly; "Add custom step" (empty builder) offers Mask/Massage/Tool/Mist/Apply per B5.3.
- New regimen schedule preselects every weekday no other regimen holds at that time of day — never silently steals days by default; tapping a "currently: X" day performs the C3.5 swap.
- Per-regimen reminder time lives on the schedule screen (B8.3 says reminders live "on the regimen itself").
- Repurchase badge shows the bottle number (`repurchase_count + 1`, e.g. "3rd"), matching the detail strip's "Bottle 2nd".
- Mark empty → [empty-product-modal]; "Repurchasing" puts it straight back in Using with bottle +1 and a fresh start date; Skip still records a history row.
- Empty-product modal built in Phase 1 (not 2) so "Mark empty" was never a dead link.
- Today: retroactive logging never starts wait timers (they only make sense live); the last unchecked step never starts a timer.
- Today has a quiet "Skip this regimen today" link (skips break the streak per C3.3); PRD lists the skip endpoint but no UI.
- ★ **Wait-timer interpretation.** PRD B3.6 says the *next* row fills; the wireframe [timer-states] ("same step, three moments") shows the *timed step's own* row filling with "Wait 4:59 before Moisturizer" and auto-checking at 100%. Built per wireframe: tapping a step with a wait starts its timer; at 100% it auto-checks. Checking the timed step or the next step during the wait opens the skip-wait sheet (B3.7); Continue checks immediately and cancels the push.
- Single active timer in the UI (C8): starting a new wait clears any running one for that regimen.
- Primary CTA = pink (conflict #2) with **ink text**, because white on pink is 2.3:1 and fails WCAG; same for the active Today tab and active pills.
- ★ Active tab: ink label at weight 600 + pink-tinted icon background (Today: solid pink circle) instead of pink label text, again for contrast. Non-colour cue = weight + filled indicator + `aria-current`.
- ★ Streak flame: ink number, blue icon tint (conflict #3). Streak number is ink, not pink (moodboard shows pink number but pink text fails contrast).
- Selected chips (filters, step type) = ink fill + check glyph, keeping pink for "active state" only.
- Destructive actions = ink, weight 500, underlined, always behind a confirmation sheet (conflict #5).
- Body text uses Instrument Sans 400 (moodboard uses 300; tokens.md lists 400/500/600).
- Edit-scope entry point: a "⋯" button on each Today step row (Skip this step / Swap product), since the PRD doesn't say how a Today edit starts.
- [signup-02] has no back chevron: the account already exists at that point and backing out would leave a half-created account.
- Dev magic link replaces the email step locally; Google button explains it's not configured in dev mode.
- Generated colours for non-CSS contexts (manifest, generated PNG icons) come from `src/styles/tokens.generated.ts`, emitted by the same generator as `tokens.css`; no hand-written hex anywhere else.
- App icon = the logo's pink asterisk drawn as shapes (no font file needed in the icon generator).
