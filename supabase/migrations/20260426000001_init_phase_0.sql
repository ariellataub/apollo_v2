-- Apollo Phase 0 — initial schema
-- Tables: pillars, users (GF team profiles), companies, experts
-- All RLS-enabled. Single GF org assumption: any authenticated user has full
-- read/write on companies & experts. Multi-org isolation can come later if ever.

-- =====================================================================
-- 1. Pillars — fixed reference table for Greenfield's Seven Pillars
-- =====================================================================
create table if not exists public.pillars (
  id smallint primary key,
  slug text not null unique,
  name text not null,
  ordinal smallint not null
);

alter table public.pillars enable row level security;

drop policy if exists "pillars_read_authenticated" on public.pillars;
create policy "pillars_read_authenticated"
  on public.pillars for select
  to authenticated
  using (true);

-- =====================================================================
-- 2. Users — GF team member profiles, mirroring auth.users
-- =====================================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "users_read_authenticated" on public.users;
create policy "users_read_authenticated"
  on public.users for select
  to authenticated
  using (true);

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self"
  on public.users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Inserts go through the auth-trigger function below (SECURITY DEFINER), so
-- no explicit insert policy is needed.

-- =====================================================================
-- 3. Companies — Greenfield portfolio companies
-- =====================================================================
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector text,
  stage text,
  lead_partner_id uuid references public.users(id) on delete set null,
  status text not null default 'Active'
    check (status in ('Active', 'Watch', 'Exited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies enable row level security;

drop policy if exists "companies_all_authenticated" on public.companies;
create policy "companies_all_authenticated"
  on public.companies for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================================
-- 4. Experts — Greenfield's expert / advisor network
-- =====================================================================
create table if not exists public.experts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  org text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.experts enable row level security;

drop policy if exists "experts_all_authenticated" on public.experts;
create policy "experts_all_authenticated"
  on public.experts for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================================
-- 5. updated_at trigger function + bindings
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists companies_updated_at on public.companies;
create trigger companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

drop trigger if exists experts_updated_at on public.experts;
create trigger experts_updated_at
  before update on public.experts
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 6. Auth trigger — auto-create public.users row on signup
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
