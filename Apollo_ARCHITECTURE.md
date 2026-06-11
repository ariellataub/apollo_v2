# Apollo — Architecture & Code Documentation

*How the app is built: stack, data model, screens, the five-stage cycle, AI logic, and how the code maps to each build phase.*
*Companion to `Apollo_HANDOFF.md`. Owner: Ariella Taub · Written: June 11, 2026*

> **Scope note.** The source code lives in the separate repo `github.com/ariellataub/apollo` (cloned locally as `Apollo_App`), not in this design folder. This document describes the app's architecture and intended structure as defined by `Apollo_Spec_v0.2.md` and the phase build prompts. Treat it as the authoritative map of *what the code does and where it should live*. When the actual file tree on disk differs from the route/file conventions below, the repo wins — update this doc to match.

---

## 1. What Apollo is, in one paragraph

Apollo turns a quarterly **health assessment** (authored in a separate Greenfield tool called Orion and exported as a PDF) into a Greenfield-quality **value-creation plan**, tracks that plan through the quarter, and learns from the outcome. It is the single source of truth for diagnosis -> prescription -> action -> learning across every active portfolio company. Internal Greenfield users only (partners, operating partners, analysts); portfolio-company executives never log in but receive action items via Slack and reply to monthly KPI emails that Apollo parses automatically. Expected scale: 10–25 active companies, 5–10 internal users.

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **Next.js (App Router)** + **Tailwind** + **shadcn/ui** | Component vocabulary Claude Code handles well. |
| Database / Auth / Storage | **Supabase** (Postgres + Row Level Security + Auth + Storage) | One cloud project serves all environments, including local dev. |
| AI | **Anthropic API — Claude Sonnet** | PDF extraction (Phase 1), plan composition (Phase 3), email parsing (Phase 5), closeout drafting (Phase 6). Called from server-side Next.js routes. |
| PDF handling | **Claude native PDF input** (base64 `document` content block) | Deliberately NOT `pdf-parse`/`pdf-lib` — Node-only PDF libs break on Cloudflare's runtime. Claude reads PDFs directly. |
| Hosting | **Cloudflare Pages** (`@opennextjs/cloudflare`, `nodejs_compat`) | Migrated from Vercel. Currently the team builds **local-first** and defers deploys to the very end. |
| Cron / jobs (future) | Cloudflare scheduled workers / Supabase Edge Functions | Weekly Slack nudges, monthly KPI emails, closeout opens (Phases 4–6). |
| Email (future) | Postmark (inbound parse + outbound transactional) | KPI round-trip (Phase 5). |
| Slack (future) | Slack Bolt SDK | Per-company channels, weekly DMs, `/apollo` slash command (Phase 4). |

Run cost at this scale: under ~$20/month while building, a bit more once AI plan generation runs regularly.

**Security model:** every authenticated Greenfield user has full read/write across the whole portfolio (RLS policy: "any authenticated user"). Per-lead-partner scoping is explicitly deferred — everyone sees everything in v1.

---

## 3. The five-stage quarterly cycle

This is the spine of the product; the UX is organized around it. Every company moves through the same five stages each quarter.

```
  (1) INTAKE        (2) PLAN          (3) REVIEW        (4) EXECUTE        (5) CLOSE
  Orion PDF    ->   Generated    ->   Greenfield   ->   Workplan +    ->   Quarter
                    draft plan        review/edit       Slack/KPIs         retro
```

| Stage | Trigger | Output | System role | Built in |
|---|---|---|---|---|
| **1 Intake** | Operator uploads Orion PDF | Parsed assessment: score, priority, narrative, pillar tags | Extract structured fields from the PDF via Claude | **Phase 1 (done)** |
| **2 Plan** | Click "Build plan" (manual) / "Generate plan" (AI) | Draft plan: objectives, KPIs, action items, experts | Compose plan; retrieve playbooks + experts (AI in Ph3) | **Phase 2 (manual, next)** / Phase 3 (AI) |
| **3 Review** | Operator opens draft | Approved plan | Track edits + approver; freeze on approve | Phase 2 (mechanics) |
| **4 Execute** | Plan approved | Live workplan + KPI dashboard (+ Slack later) | Weekly nudges, monthly KPI emails, parse replies | Phase 2 (dashboard) / Phase 4–5 (automation) |
| **5 Close** | End of quarter | Closeout report + cadence recommendation | Score delivery, recommend next-quarter cadence, surface playbook learnings | Phase 6 |

**Stage chip on the Company page is data-derived** (added in Phase 2): no assessment -> "Intake"; assessment but no plan -> "Plan"; plan Draft -> "Review"; plan Active -> "Executing"; plan Closed -> "Closed".

---

## 4. Data model

Tables exist or are planned in roughly the order the phases build them. `(P0)`, `(P1)`, `(P2)` mark which phase introduces each table; later phases are noted.

### Core entities

```
companies            (P0)
  id, name, sector, stage, lead_partner, slack_channel, logo,
  status: Active | Watch | Exited

users                (P0)  -- Greenfield team members
  id, name, email, role (Partner/Operator | Admin),
  slack_user_id, outlook_email

experts              (P0)  -- the Firm's expert network
  id, name, title, org, photo, bio,
  pillars[], topic_tags, sector_tags, stage_tags,
  engagement_models[] (Intro|Advisory|Fractional|Project),
  rate_card?, capacity_signal, availability,
  prior_engagements[], source (GF network | Vetted external)

pillars              (P0)  -- the seven, seeded
  slug, name
  -- strategy, sales-execution, pipeline-generation, people-org,
  -- operational-infrastructure, partnerships-alliances, customer-success
```

### Intake (Phase 1)

```
health_assessments   (P1)   -- one per (company, quarter)
  id, company_id (fk), quarter (text "2026-Q2"), assessor_id (fk users),
  uploaded_pdf_path (text -> Supabase Storage),
  health_score (int 1–10),
  priority (enum: Critical | High | Standard | Light-touch),
  going_well (text), needs_improvement (text),
  how_greenfield_supports (text), team_requests (text),
  pillar_tags (jsonb: [{finding, pillar_slug}]),
  status (enum: Draft | Confirmed),
  created_at, completed_at
  -- unique (company_id, quarter); RLS: any authenticated user
```

Storage bucket **`assessments`** holds the source PDFs, organized `company_id/quarter/filename.pdf`.

### Plan + execution (Phase 2)

```
plans                (P2)   -- one per (company, quarter)
  id, company_id, assessment_id (fk health_assessments), quarter,
  status (Draft | Active | Closed), narrative_summary (text),
  created_by, created_at, activated_at, closed_at
  -- unique (company_id, quarter)

objectives           (P2)
  id, plan_id, title, rationale, pillar_slug (fk pillars),
  display_order, created_at

kpis                 (P2)
  id, objective_id, name, unit, baseline (numeric), target (numeric),
  direction (higher_better | lower_better),
  cadence (Weekly | Monthly | Quarterly), display_order, created_at

kpi_readings         (P2)
  id, kpi_id, reading_month (text "YYYY-MM"), value (numeric),
  note?, entered_by, created_at
  -- unique (kpi_id, reading_month)

action_items         (P2)
  id, objective_id, title, description,
  owner_type (Greenfield | Company),
  owner_user_id? (fk users), owner_external_name?, owner_external_email?,
  due_date, status (NotStarted | InProgress | Blocked | Done),
  display_order, created_at, completed_at?
  -- validation: Greenfield => owner_user_id required;
  --             Company => owner_external_name required

action_item_updates  (P2)   -- activity log / comment thread
  id, action_item_id, author_id? (null for system events),
  source (App | System), body, created_at

team_requests        (P2)   -- "asks" surfaced from the assessment
  id, company_id, assessment_id, request_text,
  status (Open | Sourcing | Filled | Closed), created_at, updated_at
  -- persisted in P2; the board UI is a later phase
```

### Learning + automation (Phases 3–6, planned)

```
playbooks            (P3)   -- the proprietary engine
  id, title, pillar, topic_tags, sector_tags, stage_tags, version,
  source_doc, narrative_text (chunked + embedded in pgvector),
  summary, extracted_actions[], extracted_kpis[],
  prerequisites, success_signals, related_experts[],
  status (Draft | Active | Deprecated), usage_count,
  learning_log[] ({plan_id, what_worked, what_didnt, suggested_edit})

workplan / work_items (P4)  -- execution view of an approved plan
  weekly cadence, owners_by_action, slack_channel_id

kpi_data_requests    (P5)   -- monthly outbound email + inbound parse
closure_reports      (P6)   -- end-of-quarter retro
playbook_edit_suggestions (P6) -- queued for Admin review
notifications        (P4+)  -- audit log of Slack/email nudges
```

---

## 5. Screens

| Screen | Route (convention) | Purpose | Phase |
|---|---|---|---|
| Login / Sign-up | `/login` | Email/password auth via Supabase | P0 |
| Portfolio Dashboard | `/` | Sortable table of every company: name, health pill (color-coded), priority chip, lead, plan progress %, KPIs on track, last update. Filters by priority/sector/lead. | P0 |
| Company Profile | `/companies/[id]` | Vertical slice per company; header + the stage-driven body (Intake / Execute views) | P0 shell, P1 + P2 body |
| Settings → Companies | `/settings` | Admin: add/edit company (name, sector, stage, lead partner, status) | P0 |
| Intake section | on `/companies/[id]` | Upload Orion PDF, review/edit extracted assessment, Draft->Confirmed, quarter picker | P1 |
| Plan Builder | `/companies/[id]/plans/[quarter]/edit` | Two-pane: read-only assessment (left) + editable plan canvas (right). Objectives -> KPIs -> action items. Save draft / Approve & activate. | P2 |
| Read-only Plan view | `/companies/[id]/plans/[quarter]` | Non-editable plan; "Active plan · approved {date}" banner; Edit (Draft only) / Close plan (Active only) | P2 |
| Execute view | on `/companies/[id]` when plan Active | KPI dashboard (tiles + sparklines), overdue callout, month calendar of action items, action-item modal w/ activity log | P2 |

### Company page — Intake section behavior (Phase 1)

- **No current-quarter assessment:** quarter dropdown (current + prior 8) + drag/drop PDF upload zone; "Generate plan" button disabled (Phase 3). On upload, a "Reading the assessment…" spinner while Claude parses.
- **Draft assessment:** two-column layout — left = uploaded-file card + health score + priority chip + quarter chip; right = the four narrative buckets with pillar chips. All editable. "Confirm extraction" promotes Draft -> Confirmed. "Replace PDF" reverts. "Edit quarter" affordance with conflict handling.
- **Confirmed assessment:** same view, read-only, with an "Edit" button to revert to Draft.

### Execute view components (Phase 2)

KPI dashboard (two-column tile grid: uppercase label, big serif value = current-month reading or baseline, delta arrow colored by movement toward target, SVG sparkline with dashed target line; "Log monthly reading" modal). Overdue callout (red-tinted panel, only renders if 1+ overdue items). Workplan calendar (month grid, prev/next/today nav, current week tinted, today highlighted, color-coded due pills: red=overdue, blue=in progress, neutral=not started, green=done). Action-item modal (owner + due date, title, pillar + status chips, description, chronological activity timeline from `action_item_updates`, "Add update" textarea, "Mark done" + "Post update" buttons).

---

## 6. Plan generation logic (the AI core — Phase 3, planned)

The Plan Builder UI built manually in Phase 2 is the foundation; Phase 3 pre-fills it from the assessment. The mapping the generator uses:

- **needs_improvement** -> one or more **Objectives**, each pillar-tagged. Pull KPI suggestions from playbooks/library matching theme + sector + stage.
- **how_greenfield_supports** -> **action items** with `owner_type = Greenfield`, owner inferred from lead partner unless the text names someone.
- **team_requests** -> **team_requests** rows on the Asks board, plus a Greenfield-owned action item to source.
- **going_well** -> captured in the plan's `narrative_summary` as context, NOT converted to objectives (don't fix what isn't broken).

Plan depth scales with priority (Critical: 4–6 objectives / 12–20 KPIs / 25–40 actions; down to Light-touch: 1–2 / 3–5 / 4–8). Each AI-suggested action item carries a **citation** back to the source playbook passage. The operator always reviews and edits — the generator produces a starting draft, never a final plan. Every operator edit during Review is the highest-value signal Apollo collects and feeds the playbook-improvement loop at Stage 5.

**Retrieval (Phase 3):** group assessment findings by pillar -> for each pillar with material findings, semantically retrieve top-N playbook passages (pgvector, filtered by sector/stage) -> Claude composes objectives, drafts actions from `extracted_actions`, recommends KPIs from `extracted_kpis` -> attach citations.

---

## 7. The Phase 1 extraction pipeline (the one AI feature already live)

Server-side Next.js route, Cloudflare-compatible:

1. Receive the uploaded PDF from the client.
2. Send it as a base64 `document` content block to Claude (latest Sonnet that supports PDF input) via `@anthropic-ai/sdk`, paired with a structured prompt + a system prompt explaining Greenfield's Seven Pillars so tagging is consistent.
3. Claude returns JSON: `health_score` (1–10), `priority` (Critical|High|Standard|Light-touch), `going_well`, `needs_improvement`, `how_greenfield_supports`, `team_requests`, and `pillar_tags` (`[{finding, pillar_slug}]`).
4. Store the original PDF in Storage (`assessments` bucket); write the parsed fields to `health_assessments` with `status="Draft"`.
5. Return the parsed assessment to the client to render in the editable review UI.

API key is read from `process.env.ANTHROPIC_API_KEY`. The exact prompt is reviewed by Ariella before any change goes live (a standing working preference).

---

## 8. Conventions

**Health score (1–10):** 9–10 outperforming · 7–8 on track · 5–6 mixed · 3–4 off track · 1–2 distressed. Drives the color of the health pill on the dashboard.

**Priority tiers:** Critical (weekly partner check-in), High (bi-weekly), Standard (monthly, default), Light-touch (quarterly). Drives nudge frequency and plan depth.

**The Seven Pillars** (slugs used throughout the schema and AI prompts): `strategy`, `sales-execution`, `pipeline-generation`, `people-org`, `operational-infrastructure`, `partnerships-alliances`, `customer-success`.

**Design tokens** (from `Apollo_Wireframes_v4.html` — the visual source of truth):

```
--bg:    #fafaf7   (warm off-white background)
--panel: #ffffff   --panel2: #f6f4ef
--line:  #e6e2da
--ink:   #1a1a1a   --ink-soft: #444   --mute: #777067
--accent:#1f5d3f   (deep green primary)   --accent2: #2c5d8f
--warn:  #a35a1c   --bad: #9b2f2f
font: Georgia, "Times New Roman", serif (everything)
```

No new fonts or accent colors are introduced in any phase.

---

## 9. Build phases -> code mapping

| Phase | Status | Adds to schema | Adds to UI | Prompt doc |
|---|---|---|---|---|
| **0 Foundation** | Done | companies, users, experts, pillars | Login, Portfolio dashboard, Company stub, Settings/Companies | `Apollo_Build_Guide.md` |
| **1 Intake** | Done | health_assessments + `assessments` storage bucket | Intake section (upload, extract, review, confirm) + quarter picker | `Apollo_Phase1_Prompt.md`, `Apollo_Phase1_Fix_Quarter.md` |
| **2 Plan Builder** | Next | plans, objectives, kpis, kpi_readings, action_items, action_item_updates, team_requests | Plan Builder, read-only Plan view, Execute view (KPI dashboard / overdue / calendar / modal), data-derived stage chip | `Apollo_Phase2_Prompt.md` |
| **3 AI plan gen + Playbooks + Experts** | Planned | playbooks (+ pgvector), expert linkage | "Generate plan" enabled, citations, expert suggestions, playbook library + author/improve flows | TBD |
| **4 Slack** | Planned | workplan/work_items, notifications | Per-company channels, weekly DM nudges, reply ingestion, `/apollo` command | TBD |
| **5 KPI email round-trip** | Planned | kpi_data_requests | Monthly outbound email + inbound parse -> KPI readings, threshold alerts | TBD |
| **6 Closeout + learning loop** | Planned | closure_reports, playbook_edit_suggestions | Closeout report, cadence recommendation, playbook improvement review | TBD |

The infrastructure migration (Vercel -> Cloudflare) is documented in `Apollo_Cloudflare_Migration.md`; the shift to local-first development in `Apollo_Local_Setup.md`.

---

## 10. Apollo's own success metrics

How the Firm judges whether Apollo earns its place: median Orion-PDF-received -> approved-plan latency under 3 business days; 75%+ of action items completed by due date; 90%+ of KPIs updated within 7 days of the monthly email; and a growing count of active playbooks each quarter (the strongest signal that the library is learning, not just running). Operator edit rate on AI-generated content is tracked per playbook to surface weak playbooks.

---

## 11. Where to look for what (doc index)

- **This file** — architecture, data model, screens, AI logic, phase mapping.
- `Apollo_HANDOFF.md` — new-machine setup, current status, working preferences, context primer.
- `Apollo_Spec_v0.2.md` — the authoritative full product spec (current). `v0.1` is the earlier draft, kept for history.
- `Apollo_Summary.md` — one-page narrative overview.
- `Apollo_Phase2_Prompt.md` — the next build prompt (paste into Claude Code).
- `Apollo_Wireframes_v4.html` — the visual source of truth (latest; v1–v3 are earlier iterations).
- `Apollo_Build_Guide.md`, `Apollo_Phase1_Prompt.md`, `Apollo_Phase1_Fix_Quarter.md` — earlier phase prompts (built).
- `Apollo_Cloudflare_Migration.md`, `Apollo_Local_Setup.md` — infrastructure history and current local-first setup.
