-- Add `domain` column to companies for the company's primary website domain
-- (e.g. "acme.com"). Nullable — not every company will have one set initially.

alter table public.companies
  add column if not exists domain text;
