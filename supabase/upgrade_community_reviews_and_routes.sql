-- Create missing community core tables/columns used by route share + review features.
-- Safe to run multiple times.

create extension if not exists "pgcrypto";

create table if not exists public.place_reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  nickname text not null default 'Guest',
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_place_reviews_place_id on public.place_reviews(place_id);

alter table public.place_reviews enable row level security;

drop policy if exists "public can read reviews" on public.place_reviews;
create policy "public can read reviews"
on public.place_reviews for select
using (true);

drop policy if exists "public can write reviews" on public.place_reviews;
create policy "public can write reviews"
on public.place_reviews for insert
with check (true);

create table if not exists public.trip_plans (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  extra_info text,
  submitted_by text,
  submitted_by_member_id uuid,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  place_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.trip_plans
  add column if not exists description text,
  add column if not exists extra_info text,
  add column if not exists submitted_by text,
  add column if not exists submitted_by_member_id uuid,
  add column if not exists status text not null default 'pending';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trip_plans_status_check'
  ) then
    alter table public.trip_plans
      add constraint trip_plans_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists idx_trip_plans_status on public.trip_plans(status);
create index if not exists idx_trip_plans_submitted_by_member_id on public.trip_plans(submitted_by_member_id);

alter table public.trip_plans enable row level security;

drop policy if exists "public can read plans" on public.trip_plans;
create policy "public can read plans"
on public.trip_plans for select
using (status = 'approved');

drop policy if exists "public can write plans" on public.trip_plans;
create policy "public can write plans"
on public.trip_plans for insert
with check (true);

