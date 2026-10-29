# regi — Claude Code handoff package (web app)

```
BUILD_PROMPT.md        ← paste this into Claude Code
CLAUDE.md              ← persistent rules, iOS→web translation, resolved spec conflicts (auto-read by Claude Code)
docs/PRD_v3.0.md       ← full v1 spec (written for iOS; behaviour, data model and copy still apply)
docs/BUILD_APPROACH.md ← phase plan + tactics
design/tokens.md       ← colour, type, logo — visual source of truth
design/Regi-moodboard.html   ← visual system reference   (add from Drive if missing)
design/Regi_Wireframes.html  ← 27-screen layout reference (add from Drive if missing)
```

Drive folder with the design files: https://drive.google.com/drive/folders/1L7gTedE8FfZp1WW3yEas2XlBXjxS_NlE

## Before you start
- Node 20+, Supabase CLI (`brew install supabase/tap/supabase`), Docker running (for `supabase start`)
- Credentials Claude Code will ask for later (it builds against local Supabase with placeholders until then): hosted Supabase project keys, Google OAuth client, email provider for magic links, hosting/domain.

## Run
1. Unzip into an empty folder, put the two HTML files in `design/`, `cd` in, run `claude`.
2. Paste the prompt from `BUILD_PROMPT.md`.
3. If the session ends early: "Continue the regi build from PROGRESS.md. Re-read CLAUDE.md first."
4. Review `DECISIONS.md` when it's done.
