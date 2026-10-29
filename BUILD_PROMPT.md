# Kickoff prompt for Claude Code

Unzip this package into an empty folder, `cd` into it, start Claude Code, and paste everything below the line.

If the session ends before the build is finished, start a new one and paste: **"Continue the regi build from PROGRESS.md. Re-read CLAUDE.md first."**

---

You're building regi, a mobile-first skincare regimen tracker, as a web app (installable PWA), end to end from the specs in this folder. The PRD was written for native iOS; CLAUDE.md explains how to translate it to the web. Follow CLAUDE.md wherever they differ.

Design files: the wireframes and moodboard live in my Google Drive folder:
https://drive.google.com/drive/folders/1L7gTedE8FfZp1WW3yEas2XlBXjxS_NlE
If design/Regi_Wireframes.html and design/Regi-moodboard.html aren't already in this folder, fetch them from that Drive folder (via a Google Drive connector if you have one) and save them into design/ under those exact names. If you can't reach Drive, stop and tell me so I can add them myself. Don't start building UI without them.

First, read in this order: CLAUDE.md (all of it; its "Platform translation" and "Resolved conflicts" tables override the other docs), docs/PRD_v3.0.md, design/tokens.md. Then open design/Regi-moodboard.html and design/Regi_Wireframes.html and map every wireframe screen ID to its PRD Part B section and the route you'll build. Write that screen inventory to PROGRESS.md before writing any code.

Then build all phases in order, without waiting for me between phases:

Phase 0 — Foundation
1. git init; Next.js (App Router, TypeScript) project with the repo layout from CLAUDE.md; Vitest + Playwright set up; .env.example listing every env var.
2. Supabase: supabase init; migrations for every table in PRD C2 (enums, FKs, defaults, indexes from C5.1), plus a timezone column on users; RLS policies per C6.1; seed categories for all 9 step types. Run against local Supabase.
3. Core logic in src/lib, with tests written first: logicalDate() (DST transitions, the midnight–4am window), the RRULE schedule resolver (temporary schedules overriding standard ones), and streak functions.
4. Design system: tokens.css generated from design/tokens.md, Spectral + Instrument Sans via next/font, Tabler icons, the full atom library listed in CLAUDE.md, and a dev-only /dev/atoms gallery showing each atom's states.
5. App shell: 5-tab bottom nav (Today is the default route, each tab remembers its last screen, re-tapping a tab returns to its root), max-width mobile column, PWA manifest + service worker.
6. Auth: Supabase auth with Google + email magic link (placeholder config); welcome [signup-01] and username [signup-02] screens; users profile row created on signup.

Phase 1 — Solo MVP (in this order; use PRD Part B for the screens and Part C for the /api endpoints)
Products (list, filter sheet, add, detail, photo upload to Supabase Storage) → Regimens (list, detail, builder step 1 with drag-to-reorder, step editor) → Schedule (builder step 2, recurring + date range, silent conflict swap) → Today (pills, default selection, step check-off, wait timer fill + skip-wait sheet, journal note, edit-scope sheet) → empty states for Today, Products and Calendar.
Verify with a Playwright test: sign up → add 5 products → build a morning regimen → complete it → advance the logical day → the regimen reappears.

Phase 2 — Tracking
Calendar Day + Month views with shape-coded dots, expanded day card, retroactive logging marker; streak counters + a 4am rollover job (Supabase scheduled function); success animation [success-moment]; empty-product modal + user_product_history.

Phase 3 — Sharing
Share creation [share-create] using the Web Share API with copy-link fallback; share API; public /r/[slug] page [share-view] (server-rendered, Open Graph tags, yellow = sharing) and /p/[slug]; copy-to-my-regimens that survives sign-in for signed-out visitors; wishlist-add from share; view/copy/link-click tracking; My Shares dashboard [my-shares].

Phase 4 — Polish
Notification settings [notifications] with Web Push (wait-timer completion and regimen reminders; stub sending behind config if keys are missing), archive surface, account deletion, empty-state polish, accessibility pass (keyboard and screen-reader labels, focus management in sheets, reduced motion, a non-color cue on every state), Lighthouse PWA/accessibility check.

Working rules
- Build atoms before screens. No hex values or font names outside tokens.css.
- Open the wireframe section for a screen before building it. Wireframes set layout and copy only; all colors and type come from the moodboard and tokens. Check every screen at 390px width.
- Use "regimen" in all user-facing copy, never "routine".
- Commit at the end of each phase; update PROGRESS.md and DECISIONS.md each time.
- Don't stop to ask me anything except for missing credentials or accounts (see CLAUDE.md). Use placeholders, log them under "Needs Mikaela", and keep going.
- When everything is done, finish with a summary: what's built, how to run it locally and deploy it, test results, every item in "Needs Mikaela", and the top 5 entries in DECISIONS.md I should review.
