-- ย้ายข้อมูลที่อ้างอิง store_code Lotus เก่า (5001 ฯลฯ) ไปใช้รหัสใหม่ (LT05001 ฯลฯ) จับคู่ด้วย mer_code
create temp table _lotus_store_map as
select old.store_code as old_code, new.store_code as new_code, new.store_name as new_name
from public.pg_stores old
join public.pg_stores new
  on new.account = old.account
 and new.mer_code = old.mer_code
 and new.id > old.id
where old.account = 'Lotus'
  and old.store_code <> new.store_code;

do $$
declare
  t text;
begin
  foreach t in array array[
    'pg_attendance_logs',
    'pg_daily_activity_reports',
    'pg_daily_sales_reports',
    'pg_user_store_schedules'
  ]
  loop
    if to_regclass('public.' || t) is not null
       and exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = t and column_name = 'store_code'
       )
    then
      execute format(
        'update public.%I x set store_code = m.new_code from _lotus_store_map m where x.store_code = m.old_code',
        t
      );
    end if;
  end loop;
end $$;

-- store_targets มี unique(store_code): ย้ายเฉพาะรหัสที่ยังไม่มีแถวใหม่
update public.store_targets x
set store_code = m.new_code, store_name = m.new_name
from _lotus_store_map m
where x.store_code = m.old_code
  and not exists (select 1 from public.store_targets y where y.store_code = m.new_code);

update public.promotions p
set target_value = m.new_code
from _lotus_store_map m
where p.target_type = 'STORE_CODE'
  and p.target_value = m.old_code;

drop table _lotus_store_map;

