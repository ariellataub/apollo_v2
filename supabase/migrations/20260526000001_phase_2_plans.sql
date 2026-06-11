-- Apollo Phase 2 — Plans, Objectives, KPIs, Action Items, Team Requests
-- Quarterly plans built manually from a Confirmed assessment (no AI yet —
-- Phase 3 adds generation). Plan transitions Draft → Active → Closed.
-- All RLS-enabled with the same single-org "any authenticated user has full
-- read/write" policy as the existing tables.

-- =====================================================================
-- Enums (drop+create — these are new, no existing data to migrate)
-- =====================================================================
drop type if exists public.plan_status cascade;
create type public.plan_status as enum ('Draft', 'Active', 'Closed');

drop type if exists public.kpi_direction cascade;
create type public.kpi_direction as enum ('higher_better', 'lower_better');

drop type if exists public.kpi_cadence cascade;
create type public.kpi_cadence as enum ('Weekly', 'Monthly', 'Quarterly');

drop type if exists public.action_owner_type cascade;
create type public.action_owner_type as enum ('Greenfield', 'Company');

drop type if exists public.action_item_status cascade;
create type public.action_item_status as enum (
  'NotStarted',
  'InProgress',
  'Blocked',
  'Done'
);

drop type if exists public.action_update_source cascade;
create type public.action_update_source as enum ('App', 'System');

drop type if exists public.team_request_status cascade;
create type public.team_request_status as enum (
  'Open',
  'Sourcing',
  'Filled',
  'Closed'
);

-- =====================================================================
-- 1. plans — one Draft/Active/Closed plan per (company, quarter)
-- =====================================================================
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  assessment_id uuid not null references public.health_assessments(id) on delete restrict,
  quarter text not null,
  status public.plan_status not null default 'Draft',
  narrative_summary text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  closed_at timestamptz,
  unique (company_id, quarter)
);

create index if not exists plans_company_idx on public.plans (company_id);
create index if not exists plans_assessment_idx on public.plans (assessment_id);

alter table public.plans enable row level security;
drop policy if exists "plans_all_authenticated" on public.plans;
create policy "plans_all_authenticated"
  on public.plans for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================================
-- 2. objectives — pillar-tagged outcomes for the quarter
-- =====================================================================
create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  title text not null,
  rationale text,
  pillar_slug text not null references public.pillars(slug) on delete restrict,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists objectives_plan_idx on public.objectives (plan_id);

alter table public.objectives enable row level security;
drop policy if exists "objectives_all_authenticated" on public.objectives;
create policy "objectives_all_authenticated"
  on public.objectives for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================================
-- 3. kpis — measurable targets per objective
-- =====================================================================
create table if not exists public.kpis (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.objectives(id) on delete cascade,
  name text not null,
  unit text not null default '',
  baseline numeric,
  target numeric,
  direction public.kpi_direction not null default 'higher_better',
  cadence public.kpi_cadence not null default 'Monthly',
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists kpis_objective_idx on public.kpis (objective_id);

alter table public.kpis enable row level security;
drop policy if exists "kpis_all_authenticated" on public.kpis;
create policy "kpis_all_authenticated"
  on public.kpis for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================================
-- 4. kpi_readings — monthly KPI values, one per (kpi, month)
-- =====================================================================
create table if not exists public.kpi_readings (
  id uuid primary key default gen_random_uuid(),
  kpi_id uuid not null references public.kpis(id) on delete cascade,
  reading_month text not null
    check (reading_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  value numeric not null,
  note text,
  entered_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (kpi_id, reading_month)
);

create index if not exists kpi_readings_kpi_idx on public.kpi_readings (kpi_id);

alter table public.kpi_readings enable row level security;
drop policy if exists "kpi_readings_all_authenticated" on public.kpi_readings;
create policy "kpi_readings_all_authenticated"
  on public.kpi_readings for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================================
-- 5. action_items — concrete steps, owned by GF user or external Company exec
-- =====================================================================
create table if not exists public.action_items (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.objectives(id) on delete cascade,
  title text not null,
  description text,
  owner_type public.action_owner_type not null,
  owner_user_id uuid references public.users(id) on delete set null,
  owner_external_name text,
  owner_external_email text,
  due_date date,
  status public.action_item_status not null default 'NotStarted',
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  -- Owner must be supplied per the owner_type: GF assignments need a user
  -- row; Company assignments need at least a name (email optional).
  constraint action_items_owner_consistent check (
    (owner_type = 'Greenfield' and owner_user_id is not null)
    or (owner_type = 'Company' and owner_external_name is not null)
  )
);

create index if not exists action_items_objective_idx on public.action_items (objective_id);
create index if not exists action_items_owner_user_idx on public.action_items (owner_user_id);
create index if not exists action_items_due_idx on public.action_items (due_date);

alter table public.action_items enable row level security;
drop policy if exists "action_items_all_authenticated" on public.action_items;
create policy "action_items_all_authenticated"
  on public.action_items for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================================
-- 6. action_item_updates — activity timeline (manual comments + system events)
-- =====================================================================
create table if not exists public.action_item_updates (
  id uuid primary key default gen_random_uuid(),
  action_item_id uuid not null references public.action_items(id) on delete cascade,
  author_id uuid references public.users(id) on delete set null,
  source public.action_update_source not null default 'App',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists action_item_updates_item_idx
  on public.action_item_updates (action_item_id, created_at);

alter table public.action_item_updates enable row level security;
drop policy if exists "action_item_updates_all_authenticated"
  on public.action_item_updates;
create policy "action_item_updates_all_authenticated"
  on public.action_item_updates for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================================
-- 7. team_requests — discrete items operators flag from an assessment's
-- "team_requests" narrative. Phase 2 just persists; surfaced board UI lands
-- in a later phase.
-- =====================================================================
create table if not exists public.team_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  assessment_id uuid not null references public.health_assessments(id) on delete cascade,
  request_text text not null,
  status public.team_request_status not null default 'Open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_requests_company_idx on public.team_requests (company_id);
create index if not exists team_requests_assessment_idx on public.team_requests (assessment_id);

alter table public.team_requests enable row level security;
drop policy if exists "team_requests_all_authenticated" on public.team_requests;
create policy "team_requests_all_authenticated"
  on public.team_requests for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================================
-- Triggers — auto-stamp activated_at / closed_at on plans, completed_at on
-- action_items, and updated_at on team_requests.
-- =====================================================================
create or replace function public.set_plan_lifecycle_stamps()
returns trigger
language plpgsql
as $body$
begin
  if new.status = 'Active'
     and (tg_op = 'INSERT' or old.status is distinct from 'Active') then
    new.activated_at = coalesce(new.activated_at, now());
  end if;

  if new.status = 'Closed'
     and (tg_op = 'INSERT' or old.status is distinct from 'Closed') then
    new.closed_at = coalesce(new.closed_at, now());
  end if;

  return new;
end;
$body$;

drop trigger if exists plans_lifecycle_stamps on public.plans;
create trigger plans_lifecycle_stamps
  before insert or update on public.plans
  for each row execute function public.set_plan_lifecycle_stamps();

create or replace function public.set_action_item_completed_at()
returns trigger
language plpgsql
as $body$
begin
  if new.status = 'Done'
     and (tg_op = 'INSERT' or old.status is distinct from 'Done') then
    new.completed_at = now();
  elsif new.status <> 'Done' then
    new.completed_at = null;
  end if;
  return new;
end;
$body$;

drop trigger if exists action_items_completed_at on public.action_items;
create trigger action_items_completed_at
  before insert or update on public.action_items
  for each row execute function public.set_action_item_completed_at();

drop trigger if exists team_requests_updated_at on public.team_requests;
create trigger team_requests_updated_at
  before update on public.team_requests
  for each row execute function public.set_updated_at();
