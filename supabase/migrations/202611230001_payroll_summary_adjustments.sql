create table if not exists public.payroll_summary_adjustments (
  id bigint generated always as identity primary key,
  period_start date not null,
  period_end date not null,
  employee_id text not null,
  other_expenses numeric(12, 2) not null default 0 check (other_expenses >= 0),
  note text not null default '',
  updated_by bigint references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_start <= period_end),
  unique (period_start, period_end, employee_id)
);

alter table public.payroll_summary_adjustments enable row level security;
revoke all privileges on table public.payroll_summary_adjustments
  from public, anon, authenticated;