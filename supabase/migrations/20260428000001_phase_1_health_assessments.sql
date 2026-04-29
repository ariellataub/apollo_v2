-- Apollo Phase 1 — Health Assessments
-- Authored from Orion PDFs and parsed by Claude. One row per (company, quarter).
-- Status flows Draft → Confirmed once the operator validates the extraction.

-- =====================================================================
-- Enums (drop+create is safe on first run; the table that depends on
-- them doesn't exist yet)
-- =====================================================================
drop type if exists public.assessment_priority cascade;
create type public.assessment_priority as enum (
  'Critical',
  'High',
  'Standard',
  'Light-touch'
);

drop type if exists public.assessment_status cascade;
create type public.assessment_status as enum ('Draft', 'Confirmed');

-- =====================================================================
-- Table
-- =====================================================================
create table if not exists public.health_assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  quarter text not null,                       -- e.g. "2026-Q2"
  assessor_id uuid references public.users(id) on delete set null,
  uploaded_pdf_path text,                      -- Storage path: {company_id}/{quarter}/<filename>.pdf
  health_score smallint check (health_score is null or (health_score between 1 and 10)),
  priority public.assessment_priority,
  going_well text,
  needs_improvement text,
  how_greenfield_supports text,
  team_requests text,
  pillar_tags jsonb not null default '[]'::jsonb,
  status public.assessment_status not null default 'Draft',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (company_id, quarter)
);

create index if not exists health_assessments_company_idx
  on public.health_assessments (company_id);

-- =====================================================================
-- RLS — same single-org pattern as companies/experts
-- =====================================================================
alter table public.health_assessments enable row level security;

drop policy if exists "health_assessments_all_authenticated" on public.health_assessments;
create policy "health_assessments_all_authenticated"
  on public.health_assessments for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================================
-- completed_at trigger — auto-stamps when status becomes Confirmed,
-- clears when reverted to Draft.
-- =====================================================================
create or replace function public.set_assessment_completed_at()
returns trigger
language plpgsql
as $body$
begin
  if new.status = 'Confirmed'
     and (tg_op = 'INSERT' or old.status is distinct from 'Confirmed') then
    new.completed_at = now();
  elsif new.status <> 'Confirmed' then
    new.completed_at = null;
  end if;
  return new;
end;
$body$;

drop trigger if exists health_assessments_completed_at on public.health_assessments;
create trigger health_assessments_completed_at
  before insert or update on public.health_assessments
  for each row execute function public.set_assessment_completed_at();
