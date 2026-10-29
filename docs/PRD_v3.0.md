# Regi — Product Requirements Document
*v3.0 — Final v1 Specification*

> Exported from the Google Doc "Regi_PRD_v3.0". Content unchanged. Where this doc conflicts with the visual system, see `CLAUDE.md` → "Resolved conflicts".

## How to Read This Document

This PRD is organized in three parts so different readers can find what they need.

- **Part A — Product Overview (everyone).** Vision, audience, terminology, scope, design principles.
- **Part B — UX Specification (designer + frontend).** Screen-by-screen specification. Layout, behavior, copy. References match the companion HTML wireframe file.
- **Part C — Architecture & Data Model (backend).** Self-contained for backend engineering. Data model, algorithms, API surface, infra requirements.

**Companion file:** `design/Regi_Wireframes.html` — visual reference for every screen. Each screen has a reference ID cross-referenced from Part B.

---

# Part A — Product Overview

## A1. Product Vision
Regi is a skincare regimen tracker that helps users manage their products, schedule and execute daily regimens, and share their setups with others. Three core mental models: Products (what you own), Regimens (templates for using them), and the Schedule (when those regimens occur). Sharing is a first-class concern — users can publish regimens with affiliate links, making the app a natural distribution surface for skincare creators.

## A2. Audience & Positioning
Target user is a skincare enthusiast who already understands the basics. Regi is a tracking and execution tool, not an educational platform. This rules out beginner onboarding, ingredient explainers, and "what is a retinoid" content.

## A3. Core Concepts & Terminology
- **Regimen —** ordered, reusable template of steps. Steps link to products on your shelf or are free-text. Steps support optional wait timers. Internal naming uses "regimen" throughout (matches brand).
- **Product —** an item the user owns, has owned, or wishes to own. Lives in the Products tab. Three states: using / empty / wishlist.
- **Schedule —** recurrence layer assigning regimens to dates and times of day. Standard recurring schedules + date-range overrides for travel.
- **Daily Log —** per-day record of what happened. Step check states, journal note, retroactive log adjustments.
- **Share Artifact —** publishable, link-shareable view of a regimen, product, or product list.

## A4. Design Principles
- **History is inviolate.** Past data is never silently mutated. Edits are scoped to today / future.
- **No information through color alone.** Every meaningful state has a non-color cue: icon, shape, weight, label, or copy.
- **Tool, not teacher.** We don't explain skincare. We help users track and execute what they already know.
- **Streaming, not friction.** Common actions are one-tap. Decision-heavy actions get explicit confirmation.

## A5. Feature Inventory (v1)
- **Authentication —** Apple, Google, or email via Supabase Auth
- **Onboarding —** no tutorial; drop into empty-state-driven Today, Products, Calendar
- **Products —** user-scoped library, three states, ratings, notes, affiliate URLs, lifecycle tracking
- **Regimens —** ordered step templates, optional wait timers, time-of-day, weekday-based scheduling, date-range overrides
- **Today screen —** step check-off, wait timer with progress fill, both streak indicators, regimen pills
- **Calendar —** Day and Month views, dot states, expanded day card with retroactive logging
- **Streaks —** consecutive perfect days + lifetime regimens completed
- **Sharing —** link-based shares with description; deep linking via Universal Links
- **Profile —** minimal: identity, lifetime stats, My Shares, Notifications

## A6. Out of Scope for v1
- Global product catalog (planned for v2)
- Selfie / progress photo tracking (schema in place, UI deferred)
- Per-step reaction tags (schema in place, UI deferred)
- Ingredient interaction warnings
- Social graph (follow/follower, feeds)
- Native affiliate network integrations
- Custom time-of-day for regimens
- Configurable day rollover (hardcoded to 4am)
- In-app account deletion (v1.1 requirement before public App Store launch)

---

# Part B — UX Specification
*Screen-by-screen, layout, behavior, copy. Open `design/Regi_Wireframes.html` alongside this part. Reference IDs match.*

## B1. Information Architecture

### B1.1 Bottom Navigation [nav-01]
Five tabs, left to right: Products, Regimens, Today (center, prominent), Calendar, Profile. Today is visually emphasized with a subtle filled-circle background behind its icon. Other tabs use outline icons in secondary text color when inactive, primary color + 500 weight label when active.

### B1.2 Tab Behavior
- Each tab maintains its own navigation stack. Switching preserves state.
- Tapping the active tab again pops to the root.
- App always opens to the Today tab.

### B1.3 Modals vs. Pushes
- Creation flows are full-screen modals covering the bottom nav (regimen creation, share creation, empty product modal, step editor invoked from Today)
- Navigational drilling uses pushes within the tab (regimen detail, product detail)
- Bottom sheets for: filter sheets, edit-scope dialogs, action confirmations

### B1.4 Tab Icons
- **Products —** single bottle (Tabler `bottle`)
- **Regimens —** checklist (Tabler `list-check`)
- **Today —** checkbox (Tabler `checkbox`) — primary highlight
- **Calendar —** calendar grid (Tabler `calendar-month`)
- **Profile —** person (Tabler `user`)

## B2. Authentication & Onboarding

### B2.1 Sign-up Flow

**Screen 1 — Welcome / Auth [signup-01]**
- Centered branding: "Regi" + tagline "Track your regimens. Keep your streak. Share what works."
- Three auth options: Continue with Apple (primary), Continue with Google, Continue with email
- Footer: "By continuing you agree to our Terms and Privacy Policy."
- Apple is mandatory if any social auth is offered (App Store guideline)

**Screen 2 — Pick Username [signup-02]**
- Required: username with @ prefix
- Real-time availability check; success state shows green "Available"
- Optional: display name
- Username is NOT editable post-signup in v1 (avoids dead-link issues with shared regimens)

### B2.2 First-Run Behavior
After signup, drop user into the Today tab. No tutorial. Each tab teaches itself through empty states.

**Today empty state [empty-today]**
- Centered: checkbox icon, "No regimens yet" headline, "Set up a regimen and it'll show up here every morning and night" subhead
- Primary CTA: "Create a regimen" → opens regimen builder

**Products empty state [empty-products]**
- Tabs visible (using/empty/wishlist all 0)
- Centered: bottle icon, "Add your first product", "Anything you use — cleansers, serums, SPF, masks, tools."
- Primary CTA: "Add product"

**Calendar empty state [empty-calendar]**
- Faded scaffold of calendar grid
- Copy: "Your history starts now. Log your regimens for a few days and you'll see your patterns here."
- No CTA — fills naturally as user logs days

## B3. Today Screen [today-01]

### B3.1 Header
- Date navigation chevrons flank centered "Today" label and full date
- Logical date based on 4am rollover — between midnight and 4am, header reads previous calendar date
- Tapping date opens a date picker

### B3.2 Streaks (small treatment)
Two small cards side-by-side below the header:
- **Card 1 —** Flame icon (amber accent), large number, label "Perfect day streak"
- **Card 2 —** Check-in-circle icon, large number, label "Regimens completed"

Cards are visually small (not the dominant feature).

### B3.3 Regimen Pills
Equal-width pills, one per scheduled regimen. Maximum 4 regimens per day. Active pill filled with primary color; inactive have outline border.

### B3.4 Default Regimen Selection
- Show today's morning regimen until it's marked complete
- After morning is complete, show today's evening regimen
- Between midnight and 4am, show yesterday's logical-day regimens
- Users can manually switch via the pills regardless of completion

### B3.5 Step List
- Each step: checkbox + name + step type · brand subtitle
- Optional countdown number on right when wait timer active
- Tapping the row opens product detail (or step detail for free-text)
- Tapping the checkbox toggles completion

### B3.6 Wait Timer Treatment [timer-states]
When a step with `wait_seconds_after > 0` is checked:
- Next step row begins filling with translucent overlay (~8–10% opacity primary color)
- Fill animates 0% → 100% over wait duration, left to right
- Numerical countdown on right (e.g., "4:23")
- Subtitle: "Wait [time] before [next step name]" — name updates dynamically if user reorders
- At 100%, step auto-checks (transition continuous with timer fill)
- Driven from `timer_started_at` — reopening app shows correct position, not catching up
- Push notification fires when timer completes

### B3.7 Skip-Wait Confirmation
- Bottom sheet
- Title: "You still have [X minutes Y seconds] left on the wait. Continue anyway?"
- Buttons: Cancel / Continue
- On Continue: timer cancels, next step checks immediately

### B3.8 Success Animation [success-moment]
When the user checks the final step in a regimen:
- Full-screen overlay slides in (~150ms ease-out)
- Large filled checkmark scale-bounces in (~300ms)
- Soft particle confetti drifts down (~1.5s, fade out)
- Copy: "Morning complete · Day [N]"
- Streak callouts below with +1 ticker animation
- Auto-dismiss after 1.5s, or tap to dismiss
- v1 ships one default copy variant

### B3.9 Daily Journal Note
Single field at bottom. Placeholder: "Add today's note (optional)." Tapping opens an editor. Saved per regimen_instance.

## B4. Products Tab [products-01]

### B4.1 Top Bar & Tabs
- Title: "Products". Plus icon top-right opens add-product flow
- Three state tabs: Using / Empty / Wishlist with item counts

### B4.2 Filter Row
- Filter button (opens bottom sheet)
- Active filter chips inline (tap × to remove)
- Sort dropdown right-aligned

### B4.3 Card Grid
Two-column grid. Each card:
- Square image area (or category icon placeholder)
- Brand (uppercase small)
- Product name (bold, two-line truncation)
- Star rating row
- Repurchase badge top-right when count > 0 (e.g., "3rd")

### B4.4 Filter Sheet [products-filter]
- Step type chips (multi-select)
- Category picker (drilldown)
- Brand picker (drilldown, autocomplete from user's brands)
- In regimen picker (drilldown, multi-select)
- Rating chips: Any / 3+ / 4+ / 5
- "Show across all states" toggle
- Reset button
- "Show N results" CTA

### B4.5 Cross-State Discovery
When a filter is active and there are matches in other states, contextual hint above the grid: "Showing 3 Anua products in Using. See all 7 across all states →". Tapping toggles cross-state filter.

### B4.6 Empty Product Modal [empty-product-modal]
Triggered when state changes to empty:
- Header: "Finished it!" · product name · days used · "Your Nth jar" badge if repurchase_count > 0
- Star rating (large tap targets)
- Final thoughts text field (optional)
- "What's next?" radio: Repurchasing / Trying something else / Just done
- Skip + Save buttons

### B4.7 Product Detail [product-detail]
- Top bar: Back / Edit
- Hero: image (or placeholder), brand, name, category, state pill, rating row
- Lifecycle strip: Started date / Days in / Bottle number
- Notes (user's free-form text, editable on tap)
- In regimens section: tappable list of regimens using this product
- Buy link: shows affiliate URL hostname, opens external
- Bottom actions: Share / Mark empty (triggers Empty Product modal)

### B4.8 Add Product Flow
- Brand (text input, autocomplete from user's existing brands)
- Name (text input)
- Category (picker, drives step_type)
- State (default: using)
- Optional: image upload, rating, notes, affiliate URL, started_on date

## B5. Regimens Tab & Editor

### B5.1 Regimen List [regimens-01]
- Top bar: "Regimens" + plus icon
- Tabs: Mine / Shared (Shared groups by recipient name)
- Within each tab, regimens grouped by time of day: Morning / Midday / Evening (empty groups hidden)
- Each row: regimen name, schedule summary
- Date-range scheduled regimens show inline pill: "May 12–19"
- Bottom: "Archived (N)" link

### B5.2 Regimen Detail [regimen-detail]
Sticky action footer; steps scroll above.

Top section (scrollable):
- Regimen name (large)
- Time of day + schedule summary
- Ordered step list (read-only) with inline wait-time strips

Bottom section (sticky footer):
- Edit steps / Edit schedule / Share / Archive

### B5.3 Regimen Builder — Step 1: Build [regimen-builder-01, regimen-builder-empty]
- Top bar: Cancel · "Step 1 of 2"
- Editable name field labeled "Routine name"
- Time of day property row (Morning / Midday / Evening — picker)
- "For" property row (Me, or autocomplete of past target names + add new)
- Steps section with drag-to-reorder
- Empty state: dashed scaffold rows for the time of day's canonical structure
- Add custom step CTA at bottom (Mask, Massage, Tool, Mist, Apply)
- Continue to schedule CTA

**Empty-state scaffold by time of day**
- Morning: Cleanse / Treat / Moisturize / Protect
- Midday: Treat / Moisturize / Protect
- Evening: Cleanse / Treat / Moisturize

Each scaffold row has step-type icon, label, instructional hint ("Tap to add a cleanser").

### B5.4 Step Detail Editor [step-editor]
Same screen for adding new step or editing existing. Only "Remove from regimen" affordance differs.
- Step type chips: Cleanse / Treat / Moisturize / Mask / More… (overflow opens picker for the other 4)
- Product picker section: shows currently selected product card, OR empty state with two options
- Two product picker options: "From my products" (search + select) and "Don't have it on my shelf" with CTA "Type product name"
- Wait time chips: None / 1m / 5m / 10m / 20m / Custom
- Notes field (optional)
- Bottom (edit only): "Remove from regimen" in destructive style

### B5.5 Regimen Builder — Step 2: Schedule [schedule-recurring, schedule-range]

**Mode toggle**
- Two pills: Recurring / Date range
- Helper text: "Recurring runs on the same weekdays each week. Use date range for trips, short stints, or one-offs."

**Recurring mode**
- Seven weekday rows
- Selected days have primary border + checkmark
- If another regimen is scheduled at same time-of-day on this day, row shows muted text: "currently: [other regimen name]"
- Tapping a conflicting day silently swaps — selects this regimen, unassigns the other from that day
- No alert/warning treatment — informational only

**Date range mode**
- From / To date inputs
- Mini calendar visualization with selected range highlighted
- Helper text: "N days · replaces your standard [time of day] regimen for those days only"

### B5.6 Edit-Scope Dialog [edit-scope]
Fires when user modifies a step from Today (not from editor). Bottom sheet:
- **Just today —** modifies only this regimen_instance. Default selection.
- **Today and going forward —** modifies regimen template. Past instances unaffected.
- **Pick specific days —** opens calendar to multi-select dates.

Past data is never mutated. Title verb changes per action; three options are constant.

## B6. Calendar Tab

### B6.1 Day View
Same screen as Today, with horizontal day strip on top showing surrounding 7 days. Each day pill: date + small completion dots.

### B6.2 Month View [calendar-month]
- Header: month title + streak indicator
- Top toggle: Day / Month tabs
- Standard 7×N grid with weekday headers
- Each cell: day number + small completion dots (one per scheduled regimen)
- Future days: dashed border, no dots
- Past days never logged: empty circle outlines
- Selected day cell expands into detail card below grid

### B6.3 Dot States (shape distinction, not color alone)
- **Complete —** filled circle
- **Partial —** half-filled circle (bottom half filled)
- **Skipped —** circle with diagonal slash
- **No data —** empty circle outline

### B6.4 Expanded Day Card
- Logical date and "Today" label if applicable
- Per-time-of-day completion cards: "AM · [Regimen name]", completion count, slim progress bar
- Journal note preview (italicized excerpt)
- Arrow to enter that day's full Today screen view (supports retroactive logging)

## B7. Sharing

### B7.1 Share Creation Flow [share-create]
- Top bar: Cancel / "Create link"
- Header: "Share [regimen name]" with subtitle "Anyone with the link can view and copy this regimen."
- Description field (optional) with hint "Helps recipients understand what this regimen is for."
- On Create: system share sheet with the URL

### B7.2 Share View — Recipient [share-view]
Public, no account needed. Renders in browser (mobile-first, responsive).
- Creator header: avatar, @username, regimen name, time of day + step count
- Description (italicized quote, if provided)
- Stats row: views / copies / shared date
- Numbered step rows with: name, step type · brand subtitle, two compact action chips (bookmark icon → wishlist; "Link" chip → affiliate URL)
- Wait timers shown inline as muted strips
- Primary CTA: "Copy to my regimens" with hint "Adds it to your regimens. Use it as-is or edit it for your needs."
- Footer: "New to Regi? Get the app" → app store

### B7.3 Deep Linking
- Share URLs open in browser by default (responsive)
- Copy CTA deep-links into the app via Universal Links (iOS) and App Links (Android, future)
- If app installed: opens regimen import flow. If not: redirects to app store.
- Get the app CTA always opens app store

### B7.4 Copy Behavior in v1
- Each shelf-linked step from the source is copied as a free-text step on recipient's regimen, with creator's brand + name as label
- Free-text steps copy as-is
- Wait times, step types, step order, and step notes preserved
- Copied regimen has owner_user_id = recipient and cloned_from_regimen_id pointing to source
- Source affiliate URL preserved as viewable reference (not auto-applied to recipient's products)

### B7.5 Wishlist Add From Share
When recipient taps bookmark on a step:
- Wishlist user_product created on their shelf
- Brand + name from source
- Category mapped from step type
- State = wishlist
- Affiliate URL from source preserved on the new wishlist item

## B8. Profile [profile-01]

### B8.1 Layout
- Top bar: "Profile" title
- Identity card: avatar, real name, @username
- Lifetime stats strip: Day streak / Regimens / Products
- My Shares row (drills into creator dashboard)
- Notifications row
- Sign out (destructive style, centered)

### B8.2 My Shares (Creator Dashboard) [my-shares]
- Aggregate stats hero: total views / copies / link clicks
- Filter chips: All / Active / Revoked
- Sort dropdown
- Per-share rows: name, type pill, share date, stats, status pill
- Tapping a share: drilldown for copy link, edit description, revoke

### B8.3 Notifications [notifications]
Three master toggles only. Per-regimen reminder times live on the regimen itself, not here.
- Regimen reminders — overall toggle for per-regimen reminder notifications
- Wait timer alerts — notify when timer completes
- Activity on my shares — notify when someone copies a shared regimen

## B9. Cross-cutting UX Patterns

### B9.1 Bottom Sheets
All bottom sheets have a 4×36px drag handle at top, dimmed background overlay, swipe-down to dismiss.

### B9.2 Empty States
Pattern: 64px icon in soft circle → 16px medium headline → 12px secondary subhead (max 240px width) → primary CTA. Centered, ~40% from top.

### B9.3 Step Type Picker
Visible chips: Cleanse / Treat / Moisturize / Mask. "More…" overflow opens sheet listing the remaining 5: Protect / Massage / Tool / Mist / Apply.

### B9.4 Retroactive Logging
Past days editable. Step instances logged after the fact (checked_at significantly later than instance.date) display a subtle visual marker on the checkmark.

---

# Part C — Architecture & Data Model
*For backend engineering*

## C1. Stack & Infrastructure

### C1.1 Confirmed Stack
- **Frontend:** Native iOS, Swift + SwiftUI
- **Backend:** Node.js + TypeScript
- **Platform:** Supabase (PostgreSQL, Auth, Storage)
- **Communication:** REST APIs with Supabase JWT

### C1.2 Supabase Setup
- PostgreSQL database with Row-Level Security (RLS) on all tables
- Authentication: Apple, Google, email via Supabase Auth
- Storage: product photos (per-user prefixed), future selfies
- Database migrations via Supabase CLI; commit migrations to repo

### C1.3 Universal Links / App Links
Required for the share "Copy to my regimens" flow. Set up early.
- Domain: regi.app (or chosen share domain)
- iOS: configure apple-app-site-association at /.well-known/
- Android (future): assetlinks.json
- URL patterns: /r/[slug] for regimens, /p/[slug] for products, /s/[slug] for product lists

### C1.4 Push Notifications
- APNs (Apple Push Notification service) for iOS
- Use Supabase Edge Functions or a worker to schedule and dispatch
- Three notification types: regimen reminder (scheduled), wait timer completion (scheduled at +N seconds when timer starts), share activity (event-driven)

### C1.5 Web Surface for Share View
Public share viewing pages must be browser-renderable. Recommendation: lightweight Next.js app served from same domain. Static enough to be CDN-cached aggressively. Supports Open Graph for social previews.

## C2. Data Model

### C2.1 Entity Overview
- users 1:N user_products
- users 1:N regimens
- users 1:N schedule_assignments
- categories 1:N user_products
- user_products 1:N user_product_history
- user_products 1:N regimen_steps
- regimens 1:N regimen_steps
- regimens 1:N schedule_assignments
- regimens 1:N regimen_instances
- regimen_instances 1:N regimen_step_instances
- users 1:N share_artifacts

### C2.2 users
Augmented Supabase auth user with profile fields and denormalized counters.

| Field | Description / Type |
|---|---|
| id | UUID, primary key, FK to auth.users |
| username | string, unique, lowercase, 3–20 chars. Set at signup, NOT editable in v1. |
| display_name | string, nullable |
| avatar_url | string, nullable |
| current_streak_days | integer, default 0. Denormalized counter; updated on regimen completion / day change. |
| longest_streak_days | integer, default 0 |
| lifetime_regimens_completed | integer, default 0. Denormalized counter. |
| created_at / updated_at | timestamps |

### C2.3 categories
Controlled list, seeded by admin.

| Field | Description / Type |
|---|---|
| id | UUID |
| name | string, unique. e.g., "Retinoid", "Hydrating serum" |
| step_type | enum: cleanse, treat, moisturize, protect, mask, massage, tool, mist, apply |
| display_order | integer |

### C2.4 user_products
User-scoped products. v1 has no global catalog. Renamed from shelf_items to match "Products" terminology.

| Field | Description / Type |
|---|---|
| id | UUID |
| user_id | FK → users |
| brand | string, indexed |
| name | string, indexed |
| category_id | FK → categories |
| image_url | string, nullable. User-uploaded photo. |
| state | enum: using, empty, wishlist |
| star_rating | integer 0–5, nullable |
| notes | text, nullable |
| affiliate_url | string, nullable. Opaque URL. Populated from source share when wishlist item created from a shared regimen bookmark. |
| started_on | date, nullable. Auto-defaults to first regimen-instance use date if not set. |
| finished_on | date, nullable. Auto-set on transition to empty. |
| repurchase_count | integer, default 0 |
| created_at / updated_at | timestamps |

### C2.5 user_product_history

| Field | Description / Type |
|---|---|
| id | UUID |
| user_product_id | FK → user_products |
| started_on | date snapshot |
| finished_on | date snapshot |
| star_rating_at_completion | integer 0–5 |
| notes_at_completion | text |
| created_at | timestamp |

### C2.6 regimens

| Field | Description / Type |
|---|---|
| id | UUID |
| owner_user_id | FK → users |
| name | string |
| time_of_day | enum: morning, midday, evening |
| target_user_label | string, nullable. Free-text label when regimen is for someone other than owner. |
| reminder_time | time, nullable. Per-regimen reminder time. |
| is_archived | boolean, default false |
| cloned_from_regimen_id | UUID, nullable. Set when created via Copy from a shared regimen. |
| created_at / updated_at | timestamps |

### C2.7 regimen_steps

| Field | Description / Type |
|---|---|
| id | UUID |
| regimen_id | FK → regimens |
| position | integer |
| user_product_id | FK → user_products, nullable. Null = free-text step. |
| free_text_label | string, nullable. Used when user_product_id is null. |
| step_type | enum (9 values). Denormalized from category for shelf-linked steps. |
| wait_seconds_after | integer, default 0 |
| notes | text, nullable |

### C2.8 schedule_assignments

| Field | Description / Type |
|---|---|
| id | UUID |
| user_id | FK → users |
| regimen_id | FK → regimens |
| schedule_type | enum: standard, temporary. UI hint. |
| recurrence_rule | string (RRULE format). Standard: "FREQ=WEEKLY;BYDAY=MO,WE,FR". Temporary: "FREQ=DAILY" with start/end dates set. |
| start_date | date, nullable |
| end_date | date, nullable |
| priority | integer. Standard = 0, temporary = 10. Higher wins. |
| time_of_day | enum, must match regimen's |
| created_at / updated_at | timestamps |

### C2.9 regimen_instances

| Field | Description / Type |
|---|---|
| id | UUID |
| regimen_id | FK → regimens |
| user_id | FK → users (denormalized) |
| date | date. Logical day (4am rollover applied). |
| completed_at | timestamp, nullable |
| skipped | boolean, default false. Breaks streak. |
| journal_note | text, nullable |
| selfie_url | string, nullable. Schema for v2; UI deferred. |
| created_at / updated_at | timestamps |

### C2.10 regimen_step_instances
Created lazily on first interaction with a step on a given day.

| Field | Description / Type |
|---|---|
| id | UUID |
| regimen_instance_id | FK → regimen_instances |
| regimen_step_id | FK → regimen_steps, nullable |
| override_position | integer, nullable |
| override_label | string, nullable |
| override_user_product_id | FK → user_products, nullable |
| is_added_for_this_day | boolean |
| is_removed_for_this_day | boolean |
| timer_started_at | timestamp, nullable. Drives wait progress fill animation and persistent push notification. |
| checked_at | timestamp, nullable. Distinguishes real-time vs retroactive logging. |
| reaction_tags | string array. Schema for v2. |
| reaction_note | text, nullable. Schema for v2. |

### C2.11 share_artifacts

| Field | Description / Type |
|---|---|
| id | UUID |
| share_slug | string, unique. URL-safe public token. |
| creator_user_id | FK → users |
| entity_type | enum: regimen, user_product, products_list |
| entity_id | UUID, polymorphic |
| description | text, nullable. Per-share description. |
| is_active | boolean, default true |
| view_count | integer, default 0 |
| copy_count | integer, default 0 |
| link_click_count | integer, default 0 |
| created_at | timestamp |

## C3. Key Algorithms

### C3.1 Day Rollover (4am Local)
All date queries dependent on "today" derive logical_date as:

*logical_date = (now − 4 hours).date() in user's local timezone*

Implement as a single helper in both backend (Node.js) and frontend (Swift). Backend exposes endpoints accepting logical-date params; converts internally.

### C3.2 Schedule Resolution
For each time_of_day slot:

*matches = schedule_assignments WHERE user_id = user AND time_of_day = slot AND date BETWEEN start_date AND end_date AND recurrence_rule matches date*

Sort by priority desc; first match wins.

Use rrule.js for Node and a Swift port for client-side resolution if needed.

### C3.3 Streak Calculation

**Current streak (perfect days in a row)**
- On regimen completion: if completion makes today a "perfect day" (all scheduled regimens 100% complete), increment current_streak_days
- On regimen skip: set current_streak_days = 0 if previously > 0
- At day rollover (cron at 4am): if previous logical day was not perfect (any regimen incomplete or skipped), set current_streak_days = 0
- Update longest_streak_days = max(longest, current) when current changes

**Lifetime regimens completed**
- Increment lifetime_regimens_completed on each regimen_instance.completed_at transition (null → set)
- Atomic update via Postgres UPDATE … RETURNING

### C3.4 Wait Timer Resolution
Frontend animates fill using timer_started_at + wait_seconds_after — no tick-driven state. On step check before completion, frontend writes timer_started_at = NULL. On natural completion, frontend auto-checks the step.

Push notification scheduling: on tap with wait > 0, schedule local notification at (now + wait_seconds_after). On skip-wait override, cancel the scheduled notification.

### C3.5 Schedule Conflict Detection (UI-side)
When editing a regimen's recurring schedule, for each weekday show:

*conflicts = schedule_assignments WHERE user_id = user AND time_of_day = this regimen's time_of_day AND schedule_type = 'standard' AND recurrence_rule includes this weekday*

On selecting a conflicting weekday: silently remove this weekday from conflicting assignment's recurrence_rule, then add new assignment for this weekday.

## C4. API Surface

### C4.1 Auth
Handled by Supabase Auth client SDK in Swift. Backend endpoints take JWT bearer token, verify via Supabase JWT secret.

### C4.2 Products
- GET /products?state=using&filters=...
- POST /products
- GET /products/:id
- PATCH /products/:id
- DELETE /products/:id
- POST /products/:id/finish — transition to empty
- POST /products/:id/repurchase — increment count, return to using

### C4.3 Regimens
- GET /regimens?folder=mine
- POST /regimens
- GET /regimens/:id
- PATCH /regimens/:id
- POST /regimens/:id/archive
- POST /regimens/:id/steps
- PATCH /regimens/:id/steps/:step_id
- DELETE /regimens/:id/steps/:step_id
- PUT /regimens/:id/steps/order — bulk reorder

### C4.4 Schedule
- GET /schedule?from=YYYY-MM-DD&to=YYYY-MM-DD — resolved regimens per day in range
- POST /regimens/:id/schedule — create/replace
- DELETE /regimens/:id/schedule

### C4.5 Daily Execution
- GET /today — resolved regimens for current logical date with full step-instance state
- GET /day/:date
- POST /day/:date/regimens/:regimen_id/steps/:step_id/check
- DELETE /day/:date/regimens/:regimen_id/steps/:step_id/check
- POST /day/:date/regimens/:regimen_id/steps/:step_id/timer-start
- POST /day/:date/regimens/:regimen_id/skip
- PATCH /day/:date/journal

**Edit-scope semantics**
PATCH /day/:date/regimens/:regimen_id/steps/:step_id with body `{ scope: "today" | "forward" | "specific_days", days?: [...] }`. Backend handles the "forward" and "specific_days" cases by writing per-instance overrides without touching past data.

### C4.6 Sharing
- POST /shares — create share for an entity
- GET /shares — list user's shares
- GET /shares/:id — share detail with stats
- PATCH /shares/:id — edit description, revoke
- GET /public/r/:slug — public regimen share view (browser)
- GET /public/p/:slug — public product share view
- POST /shares/:slug/copy — authenticated; copies regimen to caller
- POST /shares/:slug/wishlist-add — authenticated; adds product to wishlist
- POST /public/r/:slug/track-view — increment view_count (rate-limited)

### C4.7 Profile
- GET /me — profile + lifetime stats
- PATCH /me — update display_name, avatar

## C5. Indexing & Performance

### C5.1 Recommended Indexes
- user_products (user_id, state) — primary list query
- user_products (user_id, category_id) — filter views
- regimen_steps (regimen_id, position) — ordered fetch
- schedule_assignments (user_id, time_of_day, start_date, end_date) — daily resolution is hot
- regimen_instances (user_id, date) — calendar/today queries
- regimen_step_instances (regimen_instance_id) — partial index on timer_started_at IS NOT NULL
- share_artifacts (share_slug) — unique, lookup-by-token must be fast

### C5.2 Hot Query Targets
- **Today screen load —** must be one round trip. /today returns: resolved regimens, all steps with state, current streak, journal note. Aim <100ms p95.
- **Calendar month —** /schedule?from&to combined with per-day completion summary to avoid N+1.
- **Streak query —** O(1) read from users.current_streak_days, never computed on page load.

### C5.3 Caching
- Public share views (/public/r/:slug) CDN-cached with 60s TTL
- User-private endpoints rely on Postgres + indexes

## C6. Privacy, Security, Compliance

### C6.1 Row-Level Security
- Enable RLS on all tables
- Default policy: rows visible only to user_id = auth.uid()
- Exceptions: share_artifacts (publicly readable when is_active = true), categories (publicly readable, admin-only writes)

### C6.2 Privacy Boundaries
- Daily journal notes NEVER included in any share artifact
- Selfies (v2) NEVER included in any share artifact
- Per-product notes are user-private unless explicitly included in a share

### C6.3 Account Deletion (v1.1)
App Store guideline 5.1.1(v) requires in-app account deletion if signups are offered. v1 development can defer; must be added before public App Store submission.

## C7. v2 Migration Considerations

### C7.1 Global Product Catalog
v2 introduces a hybrid model: a global products table that user_products references.
- Create products table (brand, name, category_id, image_url)
- Backfill: for each user_product, normalize (brand, name) and either match existing or create
- Add product_id (nullable) to user_products
- Subjective fields stay on user_products. Objective fields read-from-product with snapshot fallbacks.
- Recipient copying upgrades: copied steps auto-link via product_id when match exists

### C7.2 Other v2+ Features
- Reaction tags UI (schema in regimen_step_instances)
- Selfie tracking (schema in regimen_instances)
- Ingredient awareness (new ingredients, product_ingredients tables)
- Native affiliate integrations
- Social graph (follows table, profile feeds)
- Custom time-of-day
- Configurable day rollover
- Editable usernames

## C8. Decisions Deferred to User Testing
Conscious deferrals. Data model accommodates either resolution.
- **Multiple concurrent wait timers —** v1 ships single-active-timer in UI; schema supports concurrent. Test for layering users.
- **Reaction tag vocabulary —** schema in place but no v1 UI.
- **Recommended scaffold rigidity —** should the morning template enforce "end with protect"? Test for SPF compliance.
- **Public indexing of shares —** v1 unlisted only. v2 may allow opt-in discovery.
- **Configurable day rollover —** v1 hardcodes 4am. Per-user setting in v2.
- **In-app account deletion —** v1.1 before public App Store submission.

*End of document.*
