alter table public.user_profiles enable row level security;
alter table public.pg_attendance_logs enable row level security;
alter table public.pg_daily_activity_reports enable row level security;
alter table public.pg_daily_report_products enable row level security;

revoke all privileges on table public.user_profiles from public, anon, authenticated;
revoke all privileges on table public.pg_attendance_logs from public, anon, authenticated;
revoke all privileges on table public.pg_daily_activity_reports from public, anon, authenticated;
revoke all privileges on table public.pg_daily_report_products from public, anon, authenticated;