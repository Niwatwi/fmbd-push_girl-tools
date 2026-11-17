create or replace function public.koe_add_store_assignment(
  p_actor_id bigint,
  p_employee_id bigint,
  p_store_id bigint,
  p_reason text
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.user_profiles%rowtype;
  source_store public.stores%rowtype;
  assignment public.pg_stores%rowtype;
  before_data jsonb := '{}'::jsonb;
begin
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร';
  end if;
  if not exists (
    select 1
    from public.koe_accounts account
    join public.user_profiles actor
      on actor.id = account.user_id and actor.is_active = true
    where account.user_id = p_actor_id and account.is_active = true
  ) then
    raise exception 'บัญชี KOE ไม่มีสิทธิ์จัดการสาขา';
  end if;

  select * into target
  from public.user_profiles
  where id = p_employee_id and is_active = true;
  if not found or upper(trim(coalesce(target.company_tag, ''))) not in ('BA', 'BA_CHEER', 'SURVEYOR') then
    raise exception 'ไม่พบ BA Cheer ที่เปิดใช้งาน';
  end if;
  if not exists (
    select 1 from public.koe_areas
    where koe_user_id = p_actor_id and area = trim(coalesce(target.area, ''))
  ) then
    raise exception 'ไม่มีสิทธิ์จัดการ BA ใน Area นี้';
  end if;

  select * into source_store
  from public.stores
  where id = p_store_id and is_active = true;
  if not found then
    raise exception 'ไม่พบร้านค้าใน Master หรือร้านค้าถูกปิดใช้งาน';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_employee_id::text || ':' || source_store.store_code, 0)
  );

  select * into assignment
  from public.pg_stores
  where store_code = source_store.store_code
    and mer_code = target.username
  order by id desc
  limit 1
  for update;

  if found and assignment.is_active = true then
    raise exception 'ร้านค้านี้เปิดใช้งานให้ BA คนนี้อยู่แล้ว';
  end if;

  if found then
    before_data := jsonb_build_object(
      'id', assignment.id,
      'store_code', assignment.store_code,
      'store_name', assignment.store_name,
      'mer_code', assignment.mer_code,
      'company_tag', assignment.company_tag,
      'is_active', assignment.is_active
    );
    update public.pg_stores
    set store_name = source_store.store_name,
        area = source_store.area,
        company_tag = target.company_tag,
        is_active = true,
        mer_code = target.username,
        "user" = target.username,
        chanel = source_store.chanel,
        account = source_store.account,
        province = source_store.province,
        region = source_store.region,
        img_store = source_store.img_store,
        store_type = source_store.store_type,
        address = source_store.address,
        phone = source_store.phone,
        latitude = source_store.latitude,
        longitude = source_store.longitude
    where id = assignment.id
    returning * into assignment;
  else
    insert into public.pg_stores (
      store_code, store_name, area, company_tag, is_active, mer_code, "user",
      chanel, account, province, region, img_store, store_type,
      address, phone, latitude, longitude
    ) values (
      source_store.store_code, source_store.store_name, source_store.area,
      target.company_tag, true, target.username, target.username, source_store.chanel,
      source_store.account, source_store.province, source_store.region,
      source_store.img_store, source_store.store_type, source_store.address,
      source_store.phone, source_store.latitude, source_store.longitude
    ) returning * into assignment;
  end if;

  insert into public.koe_edit_audit (
    actor_id, employee_id, record_type, record_id,
    before_data, after_data, reason
  ) values (
    p_actor_id, p_employee_id, 'store_assignment', assignment.id,
    before_data,
    jsonb_build_object(
      'id', assignment.id,
      'store_code', assignment.store_code,
      'store_name', assignment.store_name,
      'mer_code', assignment.mer_code,
      'company_tag', assignment.company_tag,
      'is_active', assignment.is_active
    ),
    trim(p_reason)
  );
  return assignment.id;
end;
$$;

create or replace function public.koe_disable_store_assignment(
  p_actor_id bigint,
  p_employee_id bigint,
  p_assignment_id bigint,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.user_profiles%rowtype;
  assignment public.pg_stores%rowtype;
  updated_assignment public.pg_stores%rowtype;
begin
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร';
  end if;
  if not exists (
    select 1
    from public.koe_accounts account
    join public.user_profiles actor
      on actor.id = account.user_id and actor.is_active = true
    where account.user_id = p_actor_id and account.is_active = true
  ) then
    raise exception 'บัญชี KOE ไม่มีสิทธิ์จัดการสาขา';
  end if;

  select * into target
  from public.user_profiles
  where id = p_employee_id and is_active = true;
  if not found or upper(trim(coalesce(target.company_tag, ''))) not in ('BA', 'BA_CHEER', 'SURVEYOR') then
    raise exception 'ไม่พบ BA Cheer ที่เปิดใช้งาน';
  end if;
  if not exists (
    select 1 from public.koe_areas
    where koe_user_id = p_actor_id and area = trim(coalesce(target.area, ''))
  ) then
    raise exception 'ไม่มีสิทธิ์จัดการ BA ใน Area นี้';
  end if;

  select * into assignment
  from public.pg_stores
  where id = p_assignment_id and mer_code = target.username
  for update;
  if not found or assignment.is_active is distinct from true then
    raise exception 'ไม่พบสาขาที่เปิดใช้งานสำหรับ BA คนนี้';
  end if;

  update public.pg_stores
  set is_active = false
  where id = assignment.id
  returning * into updated_assignment;

  insert into public.koe_edit_audit (
    actor_id, employee_id, record_type, record_id,
    before_data, after_data, reason
  ) values (
    p_actor_id, p_employee_id, 'store_assignment', assignment.id,
    jsonb_build_object(
      'id', assignment.id,
      'store_code', assignment.store_code,
      'store_name', assignment.store_name,
      'mer_code', assignment.mer_code,
      'company_tag', assignment.company_tag,
      'is_active', assignment.is_active
    ),
    jsonb_build_object(
      'id', updated_assignment.id,
      'store_code', updated_assignment.store_code,
      'store_name', updated_assignment.store_name,
      'mer_code', updated_assignment.mer_code,
      'company_tag', updated_assignment.company_tag,
      'is_active', updated_assignment.is_active
    ),
    trim(p_reason)
  );
end;
$$;

revoke all on function public.koe_add_store_assignment(bigint, bigint, bigint, text)
  from public, anon, authenticated;
revoke all on function public.koe_disable_store_assignment(bigint, bigint, bigint, text)
  from public, anon, authenticated;
grant execute on function public.koe_add_store_assignment(bigint, bigint, bigint, text)
  to service_role;
grant execute on function public.koe_disable_store_assignment(bigint, bigint, bigint, text)
  to service_role;