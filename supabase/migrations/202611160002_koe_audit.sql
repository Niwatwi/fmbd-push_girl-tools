create table if not exists public.koe_edit_audit (
  id bigint generated always as identity primary key,
  actor_id bigint not null references public.user_profiles(id),
  employee_id bigint not null references public.user_profiles(id),
  record_type text not null,
  record_id bigint not null,
  before_data jsonb not null,
  after_data jsonb not null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.koe_edit_audit enable row level security;
revoke all privileges on table public.koe_edit_audit from public, anon, authenticated;

create or replace function public.koe_update_attendance(
  p_actor_id bigint, p_log_id bigint, p_check_in timestamptz,
  p_check_out timestamptz, p_reason text, p_expected_in timestamptz, p_expected_out timestamptz
) returns void language plpgsql security definer set search_path = public as $$
declare
  original public.pg_attendance_logs%rowtype;
  updated public.pg_attendance_logs%rowtype;
begin
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร'; end if;
  if p_check_in is null or (p_check_out is not null and p_check_out < p_check_in) then raise exception 'เวลาเข้าออกไม่ถูกต้อง'; end if;
  select * into original from public.pg_attendance_logs where id = p_log_id for update;
  if not found then raise exception 'ไม่พบรายการลงเวลา'; end if;
  if original.check_in_at is distinct from p_expected_in or original.check_out_at is distinct from p_expected_out then
    raise exception 'รายการเปลี่ยนแปลงแล้ว กรุณารีเฟรชก่อนแก้ไข';
  end if;
  if (original.check_in_at at time zone 'Asia/Bangkok')::date <> (p_check_in at time zone 'Asia/Bangkok')::date then
    raise exception 'ไม่สามารถเปลี่ยนวัน Check-in ได้';
  end if;
  if not exists (
    select 1 from public.koe_accounts account
    join public.user_profiles actor on actor.id = account.user_id and actor.is_active = true
    join public.koe_areas assignment on assignment.koe_user_id = account.user_id
    join public.user_profiles employee on employee.id = original.user_id and employee.is_active = true and employee.area = assignment.area
    where account.user_id = p_actor_id and account.is_active = true
  ) then raise exception 'ไม่มีสิทธิ์แก้ไขรายการนี้'; end if;
  update public.pg_attendance_logs set check_in_at = p_check_in, check_out_at = p_check_out
  where id = p_log_id returning * into updated;
  insert into public.koe_edit_audit (actor_id, employee_id, record_type, record_id, before_data, after_data, reason)
  values (p_actor_id, original.user_id, 'attendance', p_log_id,
    jsonb_build_object('check_in_at', original.check_in_at, 'check_out_at', original.check_out_at),
    jsonb_build_object('check_in_at', updated.check_in_at, 'check_out_at', updated.check_out_at), trim(p_reason));
end;
$$;
revoke all on function public.koe_update_attendance(bigint, bigint, timestamptz, timestamptz, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.koe_update_attendance(bigint, bigint, timestamptz, timestamptz, text, timestamptz, timestamptz) to service_role;