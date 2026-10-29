# Build Approach — Recommendations

> Exported from the Google Doc "Build Approach + Recommendations from Claude". The colour values in the original token example came from the early greyscale/warm wireframes and are **superseded** by `design/tokens.md` (CMY system). Everything else stands.

## What's needed for handoff
No Figma. These are enough:
1. **PRD + wireframes HTML** — source of truth for behaviour and layout.
2. **A design tokens file** (`RegiTokens.swift`) — create first, reference everywhere. Without it, every session reinvents visual choices.
3. **A small atom library** — `RegiButton`, `RegiCard`, `RegiCheckbox`, `RegiChip`, `RegiBottomSheet`, etc. Every later screen is composition. Biggest force multiplier.
4. **Repo with the PRD + HTML committed** so Claude Code can open them.

## Build sequence

### Phase 0 — Foundation
- Supabase project, schema, RLS for all v1 tables
- Auth (Apple / Google / email)
- Bottom-nav scaffold with 5 empty tabs
- Design tokens file
- 4–5 atom components
- (Ideally) Universal Links scaffolding — fiddly, start early

Produces a navigable shell. Everything depends on it.

### Phase 1 — Solo MVP (order matters)
1. Products tab + add/edit + product detail (regimens reference products)
2. Regimens tab + builder Step 1 + step editor
3. Schedule (builder Step 2) + resolution algorithm
4. Today screen + step check-off + wait timers
5. Daily journal note
6. Day rollover logic (test by manipulating clock)

**Test target:** sign up, add 5 products, build a morning regimen, do it, log it, repeat next day.

### Phase 2 — Tracking & motivation
1. Calendar Month view (Day view = Today screen)
2. Streaks (denormalized counters + 4am rollover job)
3. Success animation
4. Retroactive logging
5. Empty product modal + product history

**Test target:** two weeks of use; streaks feel rewarding.

### Phase 3 — Sharing & distribution
1. Universal Links
2. Share creation + share artifact API
3. Web share view (lightweight Next.js)
4. Copy-to-my-regimens deep link
5. Wishlist add from share
6. My Shares dashboard

**Test target:** friend without the app views in browser, installs, copies the regimen.

### Phase 4 — Polish & launch
Notifications · Archive surface · Account deletion (App Store hard requirement) · Empty-state polish · Bug fixes · Submission.

**Why Calendar before Sharing:** sharing is the most engineering complexity (deep links, public web view, share infra) and the least value if the daily loop isn't satisfying.

## Tactical Claude Code rules
- **Look at the wireframe before building any screen.** Never guess what it looks like.
- **Atoms first, screens second.** Otherwise: 600 lines of inline-styled SwiftUI. With atoms, Today is ~80 lines of composition.
- **Don't trust generated date/timezone code.** 4am rollover and RRULE need tests — e.g. what does `logicalDate()` return at 3:59am during a DST transition?
- **Lean on RLS.** No app-level "can this user see this row" checks.
- **SwiftUI previews:** 5–10 per screen (empty, loading, error, populated, edge cases) — gives screenshots for review without running the app.

## Known risks
1. Universal Links setup is fiddly — budget a full day.
2. APNs + Supabase isn't first-class — needs an Edge Function or small worker.
3. Web share view is effectively a third codebase (iOS + API + web). Decide early where it lives.
4. Account deletion is mandatory before public App Store submission.

Stack fit is good: Swift/SwiftUI, Node/TS and Supabase are all well-trodden. RRULE, push and Universal Links are the hard <10%.
