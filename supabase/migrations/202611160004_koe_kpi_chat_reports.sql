alter table public.pg_user_store_schedules
  add column if not exists shift_start_time time not null default '10:00';

create table if not exists public.koe_kpi_evaluations (
  id bigint generated always as identity primary key,
  target_user_id bigint not null references public.user_profiles(id),
  period_month date not null check (extract(day from period_month) = 1),
  assessment_type text not null check (assessment_type in ('BA_CHEER', 'BA_SUPERVISOR')),
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected')),
  criteria jsonb not null default '{}'::jsonb,
  score_percent numeric(7,2) not null default 0 check (score_percent >= 0 and score_percent <= 100),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  note text not null default '',
  submitted_by bigint references public.user_profiles(id),
  submitted_at timestamptz,
  reviewed_by bigint references public.user_profiles(id),
  reviewed_at timestamptz,
  review_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (target_user_id, period_month, assessment_type)
);
create index if not exists koe_kpi_period_status_idx on public.koe_kpi_evaluations(period_month, status, assessment_type);
alter table public.koe_kpi_evaluations enable row level security;
revoke all privileges on table public.koe_kpi_evaluations from public, anon, authenticated;

alter table public.ba_kpi_entries
  add column if not exists status text not null default 'approved' check (status in ('pending','approved','rejected')),
  add column if not exists score_percent numeric(7,2),
  add column if not exists submitted_by bigint references public.user_profiles(id),
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_by bigint references public.user_profiles(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text not null default '';

create table if not exists public.koe_chat_messages (
  id bigint generated always as identity primary key,
  sender_id bigint not null references public.user_profiles(id),
  recipient_id bigint not null references public.user_profiles(id),
  area text not null,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index if not exists koe_chat_conversation_idx on public.koe_chat_messages(sender_id, recipient_id, created_at);
create index if not exists koe_chat_recipient_idx on public.koe_chat_messages(recipient_id, read_at, created_at);
alter table public.koe_chat_messages enable row level security;
revoke all privileges on table public.koe_chat_messages from public, anon, authenticated;

create or replace function public.koe_save_evaluation(
  p_actor_id bigint,
  p_target_user_id bigint,
  p_period_month date,
  p_assessment_type text,
  p_submit boolean,
  p_criteria jsonb,
  p_score_percent numeric,
  p_amount numeric,
  p_note text
) returns bigint language plpgsql security definer set search_path = public as $$
declare
  target_area text;
  existing public.koe_kpi_evaluations%rowtype;
  saved_id bigint;
begin
  if p_period_month is null or extract(day from p_period_month) <> 1 then raise exception 'เดือนประเมินไม่ถูกต้อง'; end if;
  if p_assessment_type not in ('BA_CHEER', 'BA_SUPERVISOR') then raise exception 'ประเภท KPI ไม่ถูกต้อง'; end if;
  if p_score_percent < 0 or p_score_percent > 100 or p_amount < 0 then raise exception 'คะแนนหรือจำนวนเงินไม่ถูกต้อง'; end if;
  if length(coalesce(p_note, '')) > 2000 then raise exception 'หมายเหตุยาวเกินกำหนด'; end if;
  select area into target_area from public.user_profiles where id = p_target_user_id and is_active = true;
  if target_area is null or not exists (
    select 1 from public.koe_accounts a join public.user_profiles k on k.id=a.user_id and k.is_active=true
    join public.koe_areas ka on ka.koe_user_id=a.user_id
    where a.user_id=p_actor_id and a.is_active=true and ka.area=target_area
  ) then raise exception 'ไม่มีสิทธิ์ประเมินพนักงาน Area นี้'; end if;
  select * into existing from public.koe_kpi_evaluations
    where target_user_id=p_target_user_id and period_month=p_period_month and assessment_type=p_assessment_type for update;
  if found and existing.status not in ('draft','rejected') then raise exception 'รายการนี้ส่งอนุมัติแล้วหรืออนุมัติแล้ว'; end if;
  insert into public.koe_kpi_evaluations(target_user_id,period_month,assessment_type,status,criteria,score_percent,amount,note,submitted_by,submitted_at,reviewed_by,reviewed_at,review_note,updated_at)
  values(p_target_user_id,p_period_month,p_assessment_type,case when p_submit then 'pending' else 'draft' end,coalesce(p_criteria,'{}'::jsonb),p_score_percent,p_amount,coalesce(p_note,''),case when p_submit then p_actor_id else null end,case when p_submit then now() else null end,null,null,'',now())
  on conflict(target_user_id,period_month,assessment_type) do update set
    status=excluded.status,criteria=excluded.criteria,score_percent=excluded.score_percent,amount=excluded.amount,note=excluded.note,
    submitted_by=excluded.submitted_by,submitted_at=excluded.submitted_at,reviewed_by=null,reviewed_at=null,review_note='',updated_at=now()
  returning id into saved_id;
  return saved_id;
end;
$$;
revoke all on function public.koe_save_evaluation(bigint,bigint,date,text,boolean,jsonb,numeric,numeric,text) from public,anon,authenticated;
grant execute on function public.koe_save_evaluation(bigint,bigint,date,text,boolean,jsonb,numeric,numeric,text) to service_role;

create or replace function public.koe_review_evaluation(p_actor_id bigint,p_evaluation_id bigint,p_approve boolean,p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare
  current_status text;
begin
  if not exists (select 1 from public.user_profiles where id=p_actor_id and is_active=true and (upper(trim(username)) in ('ADMIN','ADMIN_NIWAT','FMBD03') or upper(trim(coalesce(employee_id,'')))='FMBD03' or upper(trim(company_tag))='ADMIN')) then raise exception 'ต้องเป็น Admin เพื่ออนุมัติ KPI'; end if;
  if length(coalesce(p_note,'')) > 2000 then raise exception 'หมายเหตุยาวเกินกำหนด'; end if;
  select status into current_status from public.koe_kpi_evaluations where id=p_evaluation_id for update;
  if current_status is distinct from 'pending' then raise exception 'รายการนี้ไม่อยู่ในสถานะรออนุมัติ'; end if;
  update public.koe_kpi_evaluations set status=case when p_approve then 'approved' else 'rejected' end,
    reviewed_by=p_actor_id,reviewed_at=now(),review_note=coalesce(p_note,''),updated_at=now()
    where id=p_evaluation_id;
end;
$$;
revoke all on function public.koe_review_evaluation(bigint,bigint,boolean,text) from public,anon,authenticated;
grant execute on function public.koe_review_evaluation(bigint,bigint,boolean,text) to service_role;

create or replace function public.koe_update_report(
  p_actor_id bigint,p_report_id bigint,p_products jsonb,p_feedback text,p_remark text,p_reason text
) returns void language plpgsql security definer set search_path = public as $$
declare
  original public.pg_daily_activity_reports%rowtype;
  product_item jsonb;
  before_products jsonb;
  after_products jsonb;
  changed_count integer := 0;
begin
  if length(trim(coalesce(p_reason,''))) < 3 then raise exception 'กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร'; end if;
  if length(coalesce(p_feedback,''))>5000 or length(coalesce(p_remark,''))>5000 then raise exception 'หมายเหตุยาวเกินกำหนด'; end if;
  select * into original from public.pg_daily_activity_reports where id=p_report_id for update;
  if not found then raise exception 'ไม่พบรายงาน'; end if;
  if not exists (
    select 1 from public.koe_accounts a join public.user_profiles k on k.id=a.user_id and k.is_active=true
    join public.koe_areas ka on ka.koe_user_id=a.user_id
    join public.user_profiles employee on employee.id=original.user_id and employee.is_active=true and employee.area=ka.area
    where a.user_id=p_actor_id and a.is_active=true
  ) then raise exception 'ไม่มีสิทธิ์แก้รายงานพนักงาน Area นี้'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'sales_qty',sales_qty,'stock_after',stock_after) order by id),'[]'::jsonb)
    into before_products from public.pg_daily_report_products where report_id=p_report_id and upper(coalesce(item_scope,'OUR')) <> 'COMPETITOR';
  update public.pg_daily_activity_reports set feedback_store=coalesce(p_feedback,feedback_store),remark=coalesce(p_remark,remark) where id=p_report_id;
  if jsonb_typeof(coalesce(p_products,'[]'::jsonb)) <> 'array' then raise exception 'รายการสินค้าต้องเป็น array'; end if;
  for product_item in select value from jsonb_array_elements(coalesce(p_products,'[]'::jsonb)) loop
    if coalesce((product_item->>'sales_qty')::integer,-1)<0 or ((product_item->>'stock_after') is not null and (product_item->>'stock_after')::integer<0) then raise exception 'จำนวนขายหรือสต็อกไม่ถูกต้อง'; end if;
    update public.pg_daily_report_products set sales_qty=(product_item->>'sales_qty')::integer,stock_after=(product_item->>'stock_after')::integer
      where id=(product_item->>'id')::bigint and report_id=p_report_id and upper(coalesce(item_scope,'OUR')) <> 'COMPETITOR';
    if not found then raise exception 'ไม่พบรายการสินค้าในรายงานนี้'; end if;
    changed_count := changed_count + 1;
  end loop;
  if changed_count <> jsonb_array_length(before_products) then raise exception 'จำนวนรายการสินค้าเปลี่ยนแปลง กรุณารีเฟรช'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'sales_qty',sales_qty,'stock_after',stock_after) order by id),'[]'::jsonb)
    into after_products from public.pg_daily_report_products where report_id=p_report_id and upper(coalesce(item_scope,'OUR')) <> 'COMPETITOR';
  insert into public.koe_edit_audit(actor_id,employee_id,record_type,record_id,before_data,after_data,reason)
  values(p_actor_id,original.user_id,'report',p_report_id,
    jsonb_build_object('feedback_store',original.feedback_store,'remark',original.remark,'products',before_products),
    jsonb_build_object('feedback_store',coalesce(p_feedback,original.feedback_store),'remark',coalesce(p_remark,original.remark),'products',after_products),trim(p_reason));
end;
$$;
revoke all on function public.koe_update_report(bigint,bigint,jsonb,text,text,text) from public,anon,authenticated;
grant execute on function public.koe_update_report(bigint,bigint,jsonb,text,text,text) to service_role;