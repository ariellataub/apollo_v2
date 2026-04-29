-- Apollo Phase 1 — add metrics column to health_assessments + rename pillars
-- to match the canonical Seven Pillars framework.

-- Metrics column captures the Financial Metrics Overview table from the Orion PDF.
-- Shape per row: { category, name, unit, values: [{period, value}], status }
alter table public.health_assessments
  add column if not exists metrics jsonb not null default '[]'::jsonb;

-- Display-name updates. Slugs (`strategy`, `people-org`) are unchanged.
update public.pillars set name = 'Market Strategy' where slug = 'strategy';
update public.pillars set name = 'People & Organization' where slug = 'people-org';
