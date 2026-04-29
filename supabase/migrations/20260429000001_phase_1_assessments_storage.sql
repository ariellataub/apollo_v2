-- Apollo Phase 1 — Assessments Storage bucket
-- Stores the original Orion PDFs at:  {company_id}/{quarter}/<filename>.pdf
-- Single-org RLS: any authenticated user has full access. Path conventions
-- are enforced in application code, not RLS — this matches the
-- companies_all_authenticated / experts_all_authenticated pattern.

-- =====================================================================
-- Bucket
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assessments',
  'assessments',
  false,                                  -- not public — only authenticated reads
  4194304,                                -- 4 MB cap (matches Vercel hobby body limit)
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =====================================================================
-- Storage policies
-- storage.objects already has RLS enabled by default in Supabase.
-- =====================================================================
drop policy if exists "assessments_select_authenticated" on storage.objects;
create policy "assessments_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'assessments');

drop policy if exists "assessments_insert_authenticated" on storage.objects;
create policy "assessments_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'assessments');

drop policy if exists "assessments_update_authenticated" on storage.objects;
create policy "assessments_update_authenticated"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'assessments')
  with check (bucket_id = 'assessments');

drop policy if exists "assessments_delete_authenticated" on storage.objects;
create policy "assessments_delete_authenticated"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'assessments');
