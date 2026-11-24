alter table public.user_profiles
  add column if not exists kpi_region text;

alter table public.user_profiles
  drop constraint if exists user_profiles_kpi_region_check;

alter table public.user_profiles
  add constraint user_profiles_kpi_region_check
  check (kpi_region in ('BKK', 'UPC', 'SUPERVISOR'));