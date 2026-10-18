alter table public.promotions
  add column if not exists track_gift_inventory boolean not null default false;
