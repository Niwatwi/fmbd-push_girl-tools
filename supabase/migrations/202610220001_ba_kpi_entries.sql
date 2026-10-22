create table if not exists public.ba_kpi_entries (
  id bigint generated always as identity primary key,
  period_month date not null,
  sheet_type text not null check (
    sheet_type in ('SUPERVISOR', 'BKK', 'UPC')
  ),
  employee_id text not null,
  employee_name text not null,
  store_name text not null default '',
  amount numeric(12, 2) not null check (amount >= 0),
  note text not null default '',
  updated_by bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_month, employee_id)
);

alter table public.ba_kpi_entries enable row level security;