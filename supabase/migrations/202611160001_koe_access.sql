create table if not exists public.koe_accounts (
  user_id bigint primary key references public.user_profiles(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.koe_areas (
  koe_user_id bigint not null references public.koe_accounts(user_id) on delete cascade,
  area text not null check (length(trim(area)) > 0),
  created_at timestamptz not null default now(),
  primary key (koe_user_id, area)
);

alter table public.koe_accounts enable row level security;
alter table public.koe_areas enable row level security;
revoke all privileges on table public.koe_accounts from public, anon, authenticated;
revoke all privileges on table public.koe_areas from public, anon, authenticated;

create or replace function public.set_koe_access(p_user_id bigint, p_areas text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_profiles where id = p_user_id and is_active = true) then
    raise exception 'Active user not found';
  end if;
  insert into public.koe_accounts (user_id, is_active)
  values (p_user_id, cardinality(p_areas) > 0)
  on conflict (user_id) do update set is_active = excluded.is_active;
  delete from public.koe_areas where koe_user_id = p_user_id;
  insert into public.koe_areas (koe_user_id, area)
  select p_user_id, trim(area) from unnest(p_areas) as area
  where length(trim(area)) > 0 group by trim(area);
end;
$$;

revoke all on function public.set_koe_access(bigint, text[]) from public, anon, authenticated;
grant execute on function public.set_koe_access(bigint, text[]) to service_role;