alter table public.promotions
  add column if not exists calculation_period text not null default 'DAILY';

alter table public.store_targets
  add column if not exists calculation_period text;