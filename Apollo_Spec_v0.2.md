# Apollo — Product Spec v0.2

*Greenfield Growth's portfolio value-creation platform*
*Owner: Ariella Taub · Draft date: April 26, 2026*

---

## 1. What Apollo Is

Apollo turns a quarterly health assessment (produced by Orion) into a Greenfield-quality value-creation plan, tracks it through the quarter, and learns. It does this by combining three things into one workflow: Greenfield's **Seven Pillars playbook library**, the Firm's **expert roster**, and **automated KPI tracking**. The output is faster, more consistent plans across the portfolio, and a playbook library that gets sharper every quarter.

Apollo replaces the gap between "we know what's wrong" (the assessment) and "we're acting on it" (the workplan). One source of truth for diagnosis, prescription, action, and learning.

---

## 2. The Five-Stage Pipeline

Every company moves through the same five stages each quarter. Apollo's UX is organized around them.

```
  ① INTAKE         ② PLAN           ③ REVIEW         ④ EXECUTE         ⑤ CLOSE
  Orion PDF   →   Generated   →   Greenfield   →   Workplan +    →   Quarter
                  draft plan      review/edit      Slack/KPIs        retro
```

| Stage | Trigger | Output | System role |
|---|---|---|---|
| ① **Intake** | Operator uploads Orion PDF | Parsed assessment: score, priority, narrative | Extract structured fields from PDF |
| ② **Plan** | Click "Generate plan" | Draft plan: Objectives, KPIs, Action Items, Experts | Retrieve relevant playbooks + experts; compose plan tailored to priority |
| ③ **Review** | Operator opens draft | Approved plan | Track edits + approver; freeze on approve |
| ④ **Execute** | Plan is approved | Live workplan + Slack sync + KPI dashboard | Weekly nudges, monthly KPI emails, parse replies |
| ⑤ **Close** | End of quarter | Closeout report + cadence recommendation | Score plan delivery, recommend next-quarter cadence (PMI, monthly, light-touch), surface playbook learnings |

---

## 3. Stage 1 — Intake (Orion → Apollo)

The health assessment is authored in Orion (separate Greenfield app) and exported as a PDF. Apollo accepts the PDF and parses out:

- **Health score** (numeric)
- **Priority tier** (Critical · High · Standard · Light-touch — derived from score + Orion fields)
- **Narrative findings** by section
- **Pillar tagging** (Apollo classifies each finding under one of the Seven Pillars)
- **Open issues / risks**
- **Existing strengths**

Stored as a `HealthAssessment` record linked to the Company and Quarter. Operator can view side-by-side with the original PDF and correct any extraction errors before generating a plan.

If Orion ever exposes a structured API, Apollo will switch to direct ingest. v1 is PDF-based.

---

## 4. Stage 2 — Plan Generation (Playbook-Driven)

The heart of Apollo. Given an assessment, the system composes a draft plan with four parts:

**a. Objectives** — Pillar-tagged outcomes for the quarter, derived from the assessment's gaps and risks.

**b. KPIs** — Measurable targets per objective, with baseline (from the assessment) and target (suggested by the relevant playbook).

**c. Action items** — Concrete steps drawn from the playbooks that match each objective. Each action item carries a citation back to the source playbook passage so the operator can see *why* it was suggested.

**d. Expert suggestions** — From the expert roster, surfaced based on the action item's Pillar + topic + (optionally) the company's sector/stage.

### Tailoring by priority

The depth of the plan scales with priority so we don't over-engineer light-touch companies:

| Priority | Plan depth |
|---|---|
| **Critical** | 4–6 objectives, 12–20 KPIs, 25–40 action items, multiple experts per workstream, weekly cadence |
| **High** | 3–4 objectives, 8–12 KPIs, 15–25 action items, key experts assigned, weekly cadence |
| **Standard** | 2–3 objectives, 5–8 KPIs, 8–15 action items, 1–2 experts as needed, bi-weekly cadence |
| **Light-touch** | 1–2 objectives, 3–5 KPIs, 4–8 action items, optional experts, monthly cadence |

The depth profile is configurable — these are starting defaults.

---

## 5. The Seven Pillars Playbook System

This is the engine that makes Apollo proprietary. The Seven Pillars are:

1. **Strategy**
2. **Sales Execution**
3. **Pipeline Generation**
4. **People & Org**
5. **Operational Infrastructure**
6. **Partnerships & Alliances**
7. **Customer Success**

### Playbook data model

Playbooks are narrative documents (today: Word/Notion). Apollo ingests them and stores both the original document and an extracted, structured representation:

```
Playbook
  ├── id, title, pillar, topic_tags, sector_tags, stage_tags, version
  ├── source_doc (original Word/Notion URL or upload)
  ├── narrative_text (full extracted prose, chunked + embedded for retrieval)
  ├── summary (1–2 sentence "when to use this")
  ├── extracted_actions: [{title, description, suggested_owner_role, suggested_duration}]
  ├── extracted_kpis: [{name, unit, typical_baseline_range, target_logic}]
  ├── prerequisites: text
  ├── success_signals: text
  ├── related_experts: [Expert]   # explicit links the author makes
  ├── status: Draft | Active | Deprecated
  ├── usage_count (how many plans cited it)
  └── learning_log: [{plan_id, what_worked, what_didn't, suggested_edit}]
```

### Retrieval (how playbooks find their way into a plan)

When a draft plan is generated:

1. Group assessment findings by Pillar.
2. For each Pillar with material findings, semantically retrieve the top-N matching playbook passages from the library (filtered by sector/stage if specified).
3. Use Claude to compose objectives, draft action items from `extracted_actions`, and recommend KPIs from `extracted_kpis`.
4. Each action item carries a citation: "From *[Playbook title]* — [passage]".

### Two operator-facing playbook workflows

**A. Author a missing playbook.** When the system detects a gap (e.g., a finding tagged to a Pillar that has no playbook on that topic), it surfaces *"Author a new playbook?"*. Apollo runs a structured authoring conversation: it asks Ariella the right questions (when to use, prerequisites, key actions, KPIs to track, common pitfalls), produces a draft narrative + structured fields, and saves it as a Draft playbook.

**B. Improve an existing playbook.** At plan-close, every playbook used in that plan is offered up for review: "Here's what got changed in the operator's edits, here's what worked vs didn't from the closeout report — apply as edits to the playbook?" Ariella accepts, rejects, or rewrites, and a new playbook version is saved. The `learning_log` records the source plan.

This is the "always improving" loop. The playbook library compounds with every quarter.

---

## 6. Expert Directory

The Firm's expert network — operating partners, advisors, fractional execs, agencies, vendors.

```
Expert
  ├── id, name, title, org, photo, bio
  ├── pillars: [Pillar]
  ├── topic_tags, sector_tags, stage_tags
  ├── engagement_models: [Intro | Advisory | Fractional | Project]
  ├── rate_card (optional), capacity_signal, availability
  ├── prior_engagements: [{company, plan_id, outcome_rating, notes}]
  └── source: Greenfield network | Vetted external
```

Surfaced in plans whenever an action item's Pillar+topic matches an expert. Operator can pin/unpin per action item. Apollo records which experts get used and learns which experts perform on which kinds of work over time.

---

## 7. Stage 3 — Review & Approval

The generated plan is a draft. Two roles in the workflow:

- **Operator** — edits objectives, KPIs, action items, expert assignments. Tracks every edit (what changed, when, by whom) so the playbook-improvement loop later has a clear diff.
- **Approver** — typically Ariella or the lead partner. Single click to approve. Before approval, the plan is in "Draft" or "Under Review" state. After approval, it becomes "Active" and Stage 4 kicks off.

Edits made during review are the most valuable signal Apollo collects — if operators systematically tweak certain auto-suggestions, the playbook is wrong somewhere. Surfaced in the playbook-improvement workflow.

---

## 8. Stage 4 — Execute (Workplan + Slack + KPIs)

On approval, Apollo generates the Workplan: the operational view of the plan.

### Workplan structure

```
Workplan
  ├── id, plan_id, start_date, end_date (quarter)
  ├── weekly_cadence: [Week] — each week has a list of action items due that week
  ├── owners_by_action: {action_id: User | Expert | Company exec}
  └── slack_channel_id (per-company)

WorkItem (= action item with execution metadata)
  ├── id, action_id, title, owner, due_date, status, blocked_reason
  └── updates: [{posted_at, source: app/slack/email, body}]
```

### Slack integration

- One Slack channel per company (or per plan), set up at approval time.
- Plan-published announcement with the objectives + this week's actions.
- Weekly Monday DM to each owner: *"Here are your action items this week — reply with status."* Replies post back as `WorkItem.updates`.
- Overdue digests on Wednesdays.
- Slash command `/apollo [company]` for a quick status pull.

### Monthly KPI collection (the automated round-trip)

Every KPI has a designated `data_owner` (an email address — could be a portfolio exec, could be a Greenfield team member). Once a month:

1. Apollo emails the `data_owner` a templated message:
   > *"Time for your monthly Apollo KPI update. Please reply to this email with the values for the KPIs below — just inline next to each line."*
   >
   > *Pipeline coverage (target 3.0x): \_\_\_\_\_*
   > *MRR (target $480k): \_\_\_\_\_*
   > *...*

2. The owner replies with the numbers inline.

3. Apollo's inbound email parser extracts the values (regex + Claude fallback for ambiguous formats) and writes them to `KPI.readings`.

4. If a value is missing or doesn't parse, Apollo replies asking for clarification on just the missing line.

5. The KPI dashboard updates immediately. Threshold breaches trigger a Slack alert to the lead partner.

This avoids needing to give portfolio execs login access (they already get too many tools) but keeps data flowing in.

---

## 9. Stage 5 — Close (End-of-Quarter Retro)

Two weeks before quarter-end Apollo opens a Closure Report draft:

- **KPI delivery** — for each KPI: target hit / partial / missed, with the trajectory.
- **Action delivery** — % of action items completed, blocked items with reasons, items carried over.
- **What worked / what didn't** — pulled from WorkItem.updates and operator narrative input.
- **Playbook learning** — for every playbook used, the recommended edits derived from operator edits + this quarter's outcome (feeds into Stage 5B → Improve Playbook flow).
- **Cadence recommendation** for next quarter — derived from delivery + remaining gaps:
  - *PMI deep dive* — material miss; need a heavy-touch follow-up plan
  - *Continued monthly* — solid progress, keep current cadence
  - *Step down to light-touch* — objectives largely met, low risk
  - *Graduate / exit value-creation cycle* — company is healthy

The lead partner reviews and finalizes the Closure Report, which becomes the input narrative to the *next* quarter's Orion assessment.

---

## 10. Data Model Summary

Concise reference. Detailed structures appear in §3–§9.

```
Company · User (GF team) · Expert
HealthAssessment (← from Orion PDF, per Quarter)
Plan (← composed from Assessment + Playbooks + Experts)
  ├── Objective[] ← Pillar-tagged
  ├── KPI[]      ← with monthly readings
  └── ActionItem[] ← cites Playbook passages, suggests Experts
Workplan (← derived from approved Plan)
  └── WorkItem[]  ← weekly cadence, Slack-synced
Pillar (× 7) · Playbook (versioned narrative + structured extract)
KPIDataRequest (monthly outbound email, parses inbound reply)
ClosureReport (end of quarter)
PlaybookEditSuggestion (queued for Ariella's review)
```

---

## 11. Tech Stack

- **Frontend** — Next.js (App Router) + Tailwind + shadcn/ui
- **Backend / DB** — Supabase (Postgres + RLS + Auth)
- **PDF parsing** — `unpdf` or `pdf-parse` for text; Claude for structuring fields
- **Playbook ingest** — pdf/docx/notion connectors; chunking + embeddings stored in `pgvector`
- **AI** — Anthropic API (Claude Sonnet) for plan composition, playbook authoring, email parsing fallback, closeout drafting
- **Email** — Postmark inbound parsing + outbound transactional
- **Slack** — Slack Bolt SDK
- **Cron** — Vercel Cron / Supabase Edge Functions (weekly nudges, monthly KPI emails, closeout opens)
- **Hosting** — Vercel + Supabase

---

## 12. Build Roadmap

**Phase 0 — Foundation (week 1).** Schema (companies, users, experts, pillars). Auth. Empty Portfolio screen. Manual seeding of one company + one expert.

**Phase 1 — Playbook library (week 2).** Upload narrative playbooks. Pillar tagging. Embedding + retrieval. Playbook viewer screen. Manual playbook authoring UI (no AI assist yet).

**Phase 2 — Intake + Plan generation (week 3).** Orion PDF upload + parsing. Plan generator that composes from assessment + retrieved playbooks + experts. Plan editor UI. Approval flow.

**Phase 3 — Workplan + Slack (week 4).** Approval triggers Workplan. Slack channel link. Weekly DM nudges. Reply parsing for action item updates.

**Phase 4 — KPI email round-trip (week 5).** Postmark inbound. Monthly cron job. KPI dashboard. Threshold alerts.

**Phase 5 — Closeout + playbook learning loop (week 6).** Closure Report generation. Playbook improvement workflow (review edits + apply). "Author a new playbook with AI" assistant.

**Phase 6+ — Polish, analytics, multi-quarter trends.** Cross-quarter health trends per company. Playbook usage analytics. Expert performance signals. Portfolio-level reporting.

---

## 13. Open Decisions

A short list to lock before Phase 0:

- **Orion PDF format** — do we have a stable format? Sample export will let me design the parser specifically. *Action: get one sample export.*
- **Initial playbook seed** — which playbooks exist today (Word/Notion) and which Pillars are the gaps? *Action: inventory before Phase 1.*
- **Expert directory source** — spreadsheet to import? *Action: get current expert list shape.*
- **KPI data owner default** — when a plan is generated and Apollo doesn't know who owns a KPI, who's the fallback? Options: lead partner, or "unset, prompt operator." Recommendation: prompt operator at approval time.
- **Per-company Slack channel vs single #portfolio channel** — recommend per-company channels with the option to mirror summaries to a Firm-wide channel.
- **Naming** — "Apollo" final or working title?

---

## 14. Apollo's Own Success Metrics

How we'll judge whether Apollo earns its place:

- **Plan latency** — median time from Orion PDF received → approved plan. Target: < 3 business days.
- **Plan quality** — Operator edit rate on auto-generated content (lower is better, but never zero — we want operators to add their judgment). Track per-playbook to find weak playbooks.
- **Action delivery** — % of WorkItems completed by due date across the portfolio. Target: 75%+ by Q3.
- **KPI freshness** — % of KPIs updated within 7 days of monthly email. Target: 90%.
- **Playbook library health** — # of active playbooks; coverage across the 7 Pillars; # of playbook versions per quarter (sign of learning).
