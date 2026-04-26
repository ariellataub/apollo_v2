# Apollo

Greenfield Growth's portfolio value-creation platform. See `Apollo_Spec_v0.2.md` for the product spec.

This repo is **Phase 0**: auth, the Portfolio dashboard, the Companies admin, and the database schema for `companies` / `users` / `experts` / `pillars`. Plan generation, Slack, KPI email round-trip, and the playbook learning loop come in later phases.

## Stack

- **Next.js 16** (App Router, Turbopack) on **Node 20.9+**
- **React 19** + **Tailwind CSS v4** + **shadcn/ui**
- **Supabase** — Postgres, Auth, RLS
- Vercel for hosting

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

App runs on http://localhost:3000.

### Required env vars

Both come from Supabase Dashboard → **Project Settings → API**:

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL, e.g. `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The publishable / anon key. Safe to expose in browser. |

> **After changing env vars**, fully stop the dev server (Ctrl+C) and run `npm run dev` again — Turbopack does not always re-read the proxy/middleware module on env hot-reload.

## Database

Schema lives in `supabase/migrations/`. Two files:

1. `20260426000001_init_phase_0.sql` — tables, RLS policies, triggers
2. `20260426000002_seed_pillars.sql` — seven Greenfield pillars

To apply (one-time, when the Supabase project is fresh):

- Open Supabase Dashboard → **SQL Editor** → **New query** → paste the contents of each file in order → **Run**.

Verify in **Table Editor**: `companies`, `experts`, `pillars`, `users` should exist; `pillars` should have 7 rows.

## Deploying to Vercel

### One-time setup

1. **Push to GitHub.** Create a new repo, then from this folder:
   ```bash
   git add -A
   git commit -m "Phase 0"
   git remote add origin https://github.com/<you>/<repo>.git
   git branch -M main
   git push -u origin main
   ```

2. **Import to Vercel.** vercel.com → **Add New… → Project** → pick the repo. Framework auto-detects as Next.js.

3. **Add the env vars** in the Vercel project setup screen (or later under **Settings → Environment Variables**):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   Apply to **Production**, **Preview**, and **Development**.

4. **Deploy.** First build takes a few minutes; after that you'll get a `https://<project>.vercel.app` URL.

5. **Tell Supabase about the production URL.** Supabase Dashboard → **Authentication → URL Configuration**:
   - **Site URL**: your Vercel URL
   - **Redirect URLs**: add `https://<project>.vercel.app/**` (and any custom domain you add later)

   This is required even if email confirmation is off — Supabase uses Site URL for password-reset links and any future magic-link flows.

### Subsequent deploys

`git push` to `main` deploys automatically. Pull-request branches get preview deployments at unique URLs.

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
