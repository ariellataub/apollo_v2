# Apollo — Project Handoff

*Everything needed to pick up the Apollo build on a different machine without losing a step.*
*Owner: Ariella Taub · Handoff written: June 11, 2026*

---

## 0. Read this first (30-second orientation)

Apollo is Greenfield Growth's portfolio value-creation platform — the operating system that turns a quarterly health assessment into a structured improvement plan, tracks it through the quarter, and learns from it. It is an internal-only web app, built by you directing Claude Code (you don't hand-write code).

**Two different folders, don't confuse them:**

| Folder | What's in it | Where |
|---|---|---|
| **Design / spec folder** (this one) | Specs, phase prompts, wireframes, this handoff. No code. | `C:\Users\AriellaTaub\.claude\Apollo\Apollo` |
| **Code folder** (the actual app) | The Next.js app, cloned from GitHub. | `C:\Users\AriellaTaub\Apollo_App` |

The live source of truth for the *code* is the GitHub repo **`github.com/ariellataub/apollo`**. The design folder is where planning lives. This handoff and the companion `Apollo_ARCHITECTURE.md` both live in the design folder.

**Where the build is right now:** Phase 0 and Phase 1 (plus a Phase 1 quarter-selection fix) are built. The next piece of work is **Phase 2 — the Plan Builder**, and the build mode is **local-first** (run on `localhost:3000`, no deploys until the platform is feature-complete).

---

## 1. Getting set up on the new machine

You've done these signups already — accounts carry over, you don't re-create them: **Anthropic Console**, **GitHub**, **Supabase**, **Vercel/Cloudflare**. You only need to re-install local tools and re-clone the code.

### 1a. Install the local tools

Open PowerShell and confirm each of these. Install any that are missing.

```
node --version       # want 20.x or 22.x  -> nodejs.org (LTS)
npm --version        # any recent version
git --version        # any recent version -> git-scm.com/download/win
claude --version     # npm install -g @anthropic-ai/claude-code
```

VS Code (optional but useful): https://code.visualstudio.com

### 1b. Clone the code

```
cd C:\Users\AriellaTaub
git clone https://github.com/ariellataub/apollo.git Apollo_App
cd Apollo_App
npm install
```

`npm install` takes 1–3 minutes. Warnings are fine; errors mean stop and debug.

> WARNING: Clone from **`ariellataub/apollo`**, NOT the old fork on `ariellelubick44/apollo`. The fork is dormant — don't point any deployment or clone at it.

### 1c. Recreate `.env.local`

This file holds your secrets, is gitignored, and therefore did **not** come down with the clone. Create it at the repo root with three keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
ANTHROPIC_API_KEY=sk-ant-...your-key...
```

- Supabase URL + anon key: Supabase dashboard -> Project Settings -> API. Use the **anon public** key, not the service key. No trailing slash on the URL.
- Anthropic key: console.anthropic.com -> API keys (reuse the existing one).

Easiest path: run `claude` inside `Apollo_App` and say *"Create a `.env.local` at the repo root with these three keys (values I'll paste), and confirm `.env.local` is in `.gitignore`."*

### 1d. Point Supabase at localhost

Supabase dashboard -> **Authentication -> URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: add `http://localhost:3000/**`

Leave the old Cloudflare URL in the list too — harmless, and keeps the deployed copy working if you ever demo it. Skipping this step is the #1 cause of "login fails locally with a redirect error."

### 1e. Run it

```
npm run dev
```

Open `http://localhost:3000`, log in with your existing email/password, and you should land on the Portfolio dashboard with your real companies. If you hit an auth error, 90% of the time it's a `.env.local` typo (trailing slash on the URL, or wrong key).

### 1f. Smoke-test that Phase 1 survived the move

1. Click into any company.
2. Drop in a real Orion PDF.
3. Watch the "Reading…" spinner (~10s).
4. Confirm the four narrative buckets, health score, priority chip, and pillar-tagged findings populate.
5. Edit a field, hit Confirm, refresh — it persists.

If that works, you're at the exact starting line for Phase 2.

---

## 2. The day-to-day working rhythm

- **Window 1 (PowerShell):** `npm run dev` running in `Apollo_App`. Leave it open — it hot-reloads on every change.
- **Window 2 (PowerShell):** `claude` running in `Apollo_App`. This is where you talk to Claude Code.
- **Browser:** `http://localhost:3000`, refresh after changes.
- Commit locally at meaningful milestones (`git commit`). **Do not `git push`** until the final deploy — pushing triggers an auto-build we're deliberately avoiding during the build phase.

---

## 3. Where the build stands

### Done

**Phase 0 — Foundation.** Next.js (App Router) + Tailwind + shadcn/ui app, Supabase auth (email/password) and database wired, schema for `companies`, `users`, `experts`, `pillars` (seeded with the seven Greenfield pillars). Sign-up/login flow. Portfolio dashboard matching the v4 wireframe aesthetic. Settings -> Companies admin. Your real portfolio companies are loaded.

**Phase 1 — Intake (Orion PDF -> structured assessment).** Upload an Orion PDF on a company page; a server route sends the PDF natively to Claude (no `pdf-parse` — Claude reads PDFs directly, which keeps it Cloudflare-compatible) and extracts health score, priority, the four narrative buckets, and pillar-tagged findings. Two-column editable review UI; Draft -> Confirmed promotion; stored in a `health_assessments` table with a Supabase Storage bucket (`assessments`) for the source PDFs.

**Phase 1 fix — Quarter selection.** Added a quarter dropdown on upload (current + prior 8 quarters), a visible quarter chip on the assessment, an "Edit quarter" affordance, and conflict handling on duplicate (company, quarter). This was built to backfill historical assessments and to correct a record that had been mis-saved as 2026-Q2 instead of 2025-Q4.

### Infrastructure note — hosting moved, then build mode changed

The app was originally deployed to **Vercel**, then migrated to **Cloudflare Pages** to align with Greenfield's infrastructure (`@opennextjs/cloudflare` adapter, `nodejs_compat` flag). It has since shifted to **local-first** development: everything runs on `localhost:3000` against the cloud Supabase project, with a single clean deploy planned at the very end rather than between phases. The Cloudflare/Vercel deploys may still exist as backups but are not part of the active loop.

### Next up

**Phase 2 — Plan Builder (manual, no AI yet).** A full Plan Builder to create quarterly plans by hand (objectives -> KPIs -> action items), an "Approve & activate" flow, and the v4-wireframe Execute view (KPI dashboard with sparklines, overdue callout, month calendar of action items, action-item modal with activity log). Manual monthly KPI reading entry. The complete, ready-to-paste prompt for this is in **`Apollo_Phase2_Prompt.md`** — paste it into Claude Code with the local-first rider (below) appended.

### Later phases (planned, not built)

Phase 3 — Claude-assisted plan generation + Playbook Library + Expert Directory. Phase 4 — Slack integration (weekly nudges, reply ingestion). Phase 5 — KPI email round-trip (Postmark inbound/outbound). Phase 6 — Closeout reports + the playbook learning loop. See `Apollo_Spec_v0.2.md` §12 for the full roadmap and `Apollo_ARCHITECTURE.md` for what each phase adds to the data model.

---

## 4. The immediate next action

When you're set up and Phase 1 smoke-tests clean:

1. Pick one company with a Confirmed assessment to use as your test subject.
2. Open `Apollo_Phase2_Prompt.md`, copy the build prompt block.
3. Paste it into Claude Code, **with the local-first rider appended** (Section 6 below).
4. Work step by step — Claude Code lays out a 6-step plan, then executes one step at a time, pausing for you to test in the browser.

Phase 2 is the biggest build yet (4–6 hours). If it drags, split it: steps 1–3 (DB + Plan Builder + stage chip) as "Phase 2a," steps 4–6 (Execute view) as "Phase 2b."

---

## 5. My preferences for working with Claude

These are the working conventions that have made this build go well. Carry them into every session — they're baked into the phase prompts, but state them up front on a new machine so Claude Code holds the context.

**Build local-first.** Run everything on `localhost:3000` against the cloud Supabase project. No deploys, no `git push` between phases. One clean deploy at the very end. If Claude suggests opening a Cloudflare dashboard or setting an env var in Cloudflare mid-build, push back — that's final-deploy work.

**One step at a time, with checkpoints.** For any multi-step build: lay out the full numbered plan first, then execute one step at a time. After each step, tell me what changed, exactly what to test, and wait for me to confirm before moving on. Don't race ahead.

**Ask before guessing.** Whenever you'd otherwise have to assume something I haven't specified — data shape, a UX detail, a library choice, how Orion's PDF is structured — stop and ask. A wrong guess that gets built on is more expensive than a question.

**Show me the AI prompts before wiring them in.** Any time the app itself calls Claude (PDF parsing, plan generation, email parsing, closeout drafting), show me the exact prompt/system prompt you're going to send first. I want to read it like a brief before it goes live.

**Respect phase scope — strictly.** Build only what's in the current phase. Don't pre-build later-phase features "while we're here." Each phase prompt has an explicit out-of-scope list; honor it.

**Aesthetic is fixed — match the wireframe.** Georgia serif body, deep green primary (`#1f5d3f`), warm off-white background (`#fafaf7`). No new fonts, no new accent colors. When a visual detail is ambiguous, the v4 wireframe (`Apollo_Wireframes_v4.html`) wins — reference it by filename; Claude Code can read it directly. If something looks off, tell Claude to compare against the specific component in the wireframe and match it more closely.

**Plain English over jargon.** Explain what to do and why in plain language. I'm directing the build, not hand-writing the code. When I'm stuck for more than ~20 minutes on one thing, I'll stop and bring it back to Cowork — expect that and make debugging legible.

**The data is real and irreplaceable.** This holds live Greenfield portfolio data. Prefer safe behavior on destructive operations — e.g. refuse-with-a-clear-error over silent overwrite. Ask before anything that could destroy a record.

---

## 6. Local-first rider (paste at the bottom of any phase prompt)

> **Local-first override:** Skip any deploy steps. Do not commit/push to GitHub between sub-steps. Do not reference Cloudflare or any live URL. All testing happens at `http://localhost:3000` via `npm run dev`. I'll do one clean deploy at the very end of the build, not between phases.

---

## 7. Context primer — paste this into Claude Code (or Cowork) on the new machine

Copy this whole block into a fresh Claude Code session in `Apollo_App` at the start, so it understands the project and how I work before we touch any code.

> I'm continuing work on **Apollo**, Greenfield Growth's internal portfolio value-creation platform. You'll be acting as my coding assistant — I direct the build, you write the code.
>
> **What Apollo is:** an internal web app (Greenfield team only, ~5–10 users, 10–25 portfolio companies) that runs every portfolio company through a five-stage quarterly cycle: (1) Intake (upload an Orion health-assessment PDF, extract a structured assessment) -> (2) Plan (build a quarterly plan: objectives, KPIs, action items) -> (3) Review (edit + approve) -> (4) Execute (workplan, KPI dashboard, Slack nudges, monthly KPI emails) -> (5) Close (quarter retro + playbook learning). The proprietary core is the Seven Pillars playbook library, an expert directory, and a learning loop that sharpens the playbooks each quarter.
>
> **Stack:** Next.js (App Router) + Tailwind + shadcn/ui · Supabase (Postgres + RLS + Auth + Storage) · Anthropic API (Claude Sonnet) for AI features · originally Cloudflare Pages, now built local-first.
>
> **Current status:** Phase 0 (foundation, auth, portfolio dashboard, company roster) and Phase 1 (Orion PDF intake + Claude extraction + quarter selection) are done. Next is Phase 2 — the manual Plan Builder + Execute view.
>
> **Repo + docs:** code is in this folder (`Apollo_App`, cloned from github.com/ariellataub/apollo). The spec and phase prompts live in my separate design folder — the key ones are `Apollo_Spec_v0.2.md` (full spec + data model), `Apollo_Phase2_Prompt.md` (next build), `Apollo_Wireframes_v4.html` (visual source of truth), and `Apollo_ARCHITECTURE.md` (codebase documentation). Ask me to paste any of these if you need them.
>
> **How I work — follow these every session:**
> - Local-first: everything runs on localhost:3000, no deploys, no git push until I say so at the very end.
> - One step at a time: lay out the full numbered plan first, then do one step, tell me what to test, and wait for my confirmation before the next.
> - Ask before guessing on anything I haven't specified.
> - Show me the exact prompt before wiring any call to the Claude API.
> - Stay strictly within the current phase's scope.
> - Match the existing aesthetic exactly: Georgia serif, deep green (#1f5d3f), warm off-white (#fafaf7), no new fonts or colors; the v4 wireframe wins on visual details.
> - This is real Greenfield data — prefer safe, non-destructive behavior and ask before anything risky.
>
> Don't write any code yet. First confirm you've understood, then ask me which phase or task we're starting.

---

## 8. Companion document

`Apollo_ARCHITECTURE.md` (same folder) documents the codebase itself — the data model, every screen, the five-stage cycle, plan-generation logic, route/file structure, and how the code maps to each phase. Read it alongside this handoff when onboarding a new machine or a new collaborator.

---

## 9. Common hiccups (recognize these fast)

- **"npm" / "claude" not found** -> restart PowerShell after installing Node / Claude Code.
- **Auth error on localhost** -> `.env.local` typo (trailing slash on URL, or service key instead of anon key), or missing the localhost entry in Supabase URL Configuration.
- **Login works locally but not in production** -> Supabase Site URL / Redirect URL mismatch (a deploy-time concern only).
- **"Module not found: fs / path" in a Cloudflare build** -> a Node-only library leaked in; this is why PDF parsing uses Claude's native PDF input instead of `pdf-parse`. Deploy-time concern only.
- **Stuck >20 minutes on one thing** -> stop, bring it back to Cowork with the step number and the error/screenshot.
