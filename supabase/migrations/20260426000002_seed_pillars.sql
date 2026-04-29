-- Seed the seven Greenfield pillars. Idempotent — safe to re-run.

insert into public.pillars (id, slug, name, ordinal) values
  (1, 'strategy',                   'Market Strategy',            1),
  (2, 'sales-execution',            'Sales Execution',            2),
  (3, 'pipeline-generation',        'Pipeline Generation',        3),
  (4, 'people-org',                 'People & Organization',      4),
  (5, 'operational-infrastructure', 'Operational Infrastructure', 5),
  (6, 'partnerships-alliances',     'Partnerships & Alliances',   6),
  (7, 'customer-success',           'Customer Success',           7)
on conflict (id) do update
  set slug = excluded.slug,
      name = excluded.name,
      ordinal = excluded.ordinal;
