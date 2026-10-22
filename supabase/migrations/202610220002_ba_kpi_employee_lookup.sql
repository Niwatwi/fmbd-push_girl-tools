alter table public.ba_kpi_entries
  add column if not exists username text,
  add column if not exists company_tag text not null default '',
  add column if not exists store_names text[] not null default '{}';

update public.ba_kpi_entries
set username = employee_id
where username is null;

alter table public.ba_kpi_entries
  alter column username set not null;

create unique index if not exists ba_kpi_entries_period_username_uidx
  on public.ba_kpi_entries (period_month, username);