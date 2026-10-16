-- ปิดการใช้งานแถว Lotus เก่า (store_code 5001 ฯลฯ) ที่ซ้ำกับแถวใหม่ (LT05001 ฯลฯ) ตาม mer_code
update public.pg_stores old
set is_active = false
where old.account = 'Lotus'
  and old.is_active = true
  and exists (
    select 1
    from public.pg_stores new
    where new.account = old.account
      and new.mer_code = old.mer_code
      and new.id > old.id
  );

-- ลบถาวร: รันเมื่อตรวจแล้วว่าไม่มีตารางอื่นอ้างอิง store_code เก่า (attendance, schedules, reports)
-- delete from public.pg_stores where account = 'Lotus' and is_active = false;
