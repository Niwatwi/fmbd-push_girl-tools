alter table public.user_profiles
  add column if not exists kpi_region text;

update public.user_profiles
set kpi_region = 'BKK'
where kpi_region is null
  and (
    lower(replace(coalesce(area, ''), ' ', '')) in ('bkk', 'กรุงเทพมหานคร', 'กรุงเทพ', 'กทม', 'bangkok')
  );

update public.user_profiles
set kpi_region = 'UPC'
where kpi_region is null;

alter table public.user_profiles
  alter column kpi_region set default 'UPC';

alter table public.user_profiles
  drop constraint if exists user_profiles_kpi_region_check;

alter table public.user_profiles
  add constraint user_profiles_kpi_region_check
  check (kpi_region in ('BKK', 'UPC'));