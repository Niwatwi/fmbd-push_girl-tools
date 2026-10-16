alter table public.store_targets
  add column if not exists promotion_id text,
  add column if not exists promotion_name text;
