# Apollo

Greenfield Growth's portfolio value-creation platform. See `Apollo_Spec_v0.2.md` for the product spec.

This repo is **Phase 0**: auth, the Portfolio dashboard, the Companies admin, and the database schema for `companies` / `users` / `experts` / `pillars`. Plan generation, Slack, KPI email round-trip, and the playbook learning loop come in later phases.

## Stack

- **Next.js 16** (App Router, Turbopack) on **Node 20.9+**
- **React 19** + **Tailwind CSS v4** + **shadcn/ui**
- **Supabase** — Postgres, Auth, RLS, Storage
- **Anthropic Claude** (Sonnet 4.6) for PDF extraction
- Cloudflare for hosting

> **Cloudflare runtime caveat:** server code runs on a V8-based runtime, not Node. Avoid Node-only APIs (`Buffer`, `fs`, `pdf-parse`, etc.) — use Web standards (`Uint8Array`, `btoa`, `fetch`). The Anthropic SDK and `@supabase/ssr` are both Web-API-based and work as-is.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

App runs on http://localhost:3000.

### Required env vars

| Variable | Source | What it is |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Project URL, e.g. `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Publishable / anon key. Safe to expose in browser. |
| `ANTHROPIC_API_KEY` | Anthropic Console → Settings → API Keys | Server-side only. Used for PDF assessment extraction. |

> **After changing env vars**, fully stop the dev server (Ctrl+C) and run `npm run dev` again — Turbopack does not always re-read the proxy/middleware module on env hot-reload.

## Database

Schema lives in `supabase/migrations/`. Two files:

1. `20260426000001_init_phase_0.sql` — tables, RLS policies, triggers
2. `20260426000002_seed_pillars.sql` — seven Greenfield pillars

To apply (one-time, when the Supabase project is fresh):

- Open Supabase Dashboard → **SQL Editor** → **New query** → paste the contents of each file in order → **Run**.

Verify in **Table Editor**: `companies`, `experts`, `pillars`, `users` should exist; `pillars` should have 7 rows.

## Deploying to Cloudflare

The Cloudflare project is connected to this GitHub repo and rebuilds on `git push` to `main`. All three env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`) live in the Cloudflare dashboard — no per-deploy config needed.

When adding a new env var:
1. Cloudflare dashboard → the Workers/Pages project → **Settings → Environment variables** → add for **Production** (and Preview if used).
2. Trigger a redeploy so the new var is picked up.

When deploying to a new domain:
- Supabase Dashboard → **Authentication → URL Configuration** → add the domain to **Site URL** and **Redirect URLs** so auth cookies validate. Required even if email confirmation is off (Supabase uses Site URL for password-reset and magic-link flows).

## Project layout

```
app/
  (app)/                  # authenticated app shell (top bar + sidebar)
    layout.tsx            # fetches user, derives initials, logout button
    portfolio/            # the dashboard
    companies/[id]/       # company detail stub
    settings/             # Companies admin (list + add + edit)
  (auth)/                 # unauthenticated routes (centered card layout)
    login/
    signup/
    actions.ts            # login / signup / logout server actions
  _components/
    sidebar-nav.tsx
  globals.css             # Apollo design tokens + component classes
  layout.tsx              # root html/body
  page.tsx                # / -> redirect to /portfolio
proxy.ts                  # session refresh + route protection
lib/supabase/
  client.ts               # browser client
  server.ts               # server client (SCs / server actions)
  types.ts                # hand-written DB types
supabase/migrations/      # versioned SQL
```

## Troubleshooting

- **"Your project's URL and Key are required to create a Supabase client!"** — the dev server started without env vars. Stop and restart after `.env.local` is filled in.
- **Page hangs forever loading** — usually a stale dev server still owns port 3000. `Stop-Process -Name node -Force` (PowerShell) or kill it manually, then `npm run dev`.
- **Login succeeds but immediately bounces to /login again** — Supabase cookies aren't persisting; check the proxy is still wired and that `NEXT_PUBLIC_SUPABASE_URL` matches the project the publishable key belongs to.
