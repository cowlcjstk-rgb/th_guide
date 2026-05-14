-- Safe upgrade script for pending workflow + community/member/product tables
-- Can run on partially initialized DBs without failing.

create extension if not exists "pgcrypto";

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  address text,
  district text,
  category text,
  tags text[] default '{}',
  latitude numeric(10,7),
  longitude numeric(10,7),
  google_map_url text,
  thumbnail text,
  tips text,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_plans (
  id uuid primary key default gen_random_uuid(),
  title text,
  place_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.place_images (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.places
  add column if not exists city text,
  add column if not exists submission_status text not null default 'approved',
  add column if not exists submitted_by text,
  add column if not exists last_verified_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'places_submission_status_check'
  ) then
    alter table public.places
      add constraint places_submission_status_check
      check (submission_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

alter table public.trip_plans
  add column if not exists description text,
  add column if not exists extra_info text,
  add column if not exists submitted_by text,
  add column if not exists status text not null default 'pending';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'trip_plans_status_check'
  ) then
    alter table public.trip_plans
      add constraint trip_plans_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists idx_places_city on public.places(city);
create index if not exists idx_places_submission_status on public.places(submission_status);
create index if not exists idx_places_latitude on public.places(latitude);
create index if not exists idx_places_longitude on public.places(longitude);
create index if not exists idx_trip_plans_status on public.trip_plans(status);

alter table public.trip_plans enable row level security;
drop policy if exists "public can read plans" on public.trip_plans;
create policy "public can read plans"
on public.trip_plans for select
using (status = 'approved');

drop policy if exists "public can write plans" on public.trip_plans;
create policy "public can write plans"
on public.trip_plans for insert
with check (true);

create table if not exists public.community_contents (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('top-rated', 'latest-reviews', 'route-shares', 'guide', 'faq')),
  title_ko text not null,
  title_en text not null,
  body_ko text not null default '',
  body_en text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_community_contents_section on public.community_contents(section);
create index if not exists idx_community_contents_sort on public.community_contents(sort_order);

alter table public.community_contents enable row level security;
drop policy if exists "public can read community contents" on public.community_contents;
create policy "public can read community contents"
on public.community_contents for select
using (true);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  login_id text,
  login_id_normalized text,
  name text not null,
  phone text not null,
  phone_normalized text not null,
  email text not null,
  email_normalized text not null,
  password_hash text,
  role text not null default 'member',
  kakao_id text,
  line_id text,
  telegram_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

update public.members
set login_id = lower(split_part(email, '@', 1)) || '_' || right(replace(id::text, '-', ''), 6)
where coalesce(login_id, '') = '';

update public.members
set login_id_normalized = lower(login_id)
where coalesce(login_id_normalized, '') = '';

alter table public.members
  alter column login_id set not null,
  alter column login_id_normalized set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'members_role_check'
  ) then
    alter table public.members
      add constraint members_role_check
      check (role in ('member', 'admin'));
  end if;
end $$;

create index if not exists idx_members_name on public.members(name);
create index if not exists idx_members_created_at on public.members(created_at);
create unique index if not exists members_login_id_normalized_key on public.members(login_id_normalized);
create unique index if not exists members_phone_normalized_key on public.members(phone_normalized);
create unique index if not exists members_email_normalized_key on public.members(email_normalized);

alter table public.members enable row level security;

create table if not exists public.travel_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  main_category text not null default 'Nightlife',
  sub_category text not null check (sub_category in ('Massage', 'Karaoke', 'Local Venue', 'Travel Product')),
  city text not null check (city in ('Bangkok', 'Pattaya', 'Chiang Mai')),
  price_min numeric(12,2),
  image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_travel_products_city on public.travel_products(city);
create index if not exists idx_travel_products_sub_category on public.travel_products(sub_category);
create index if not exists idx_travel_products_published on public.travel_products(is_published);

alter table public.travel_products enable row level security;
drop policy if exists "public can read published travel products" on public.travel_products;
create policy "public can read published travel products"
on public.travel_products for select
using (is_published = true);

drop policy if exists "auth users can manage places" on public.places;
drop policy if exists "auth users can manage place_images" on public.place_images;
drop policy if exists "auth users can manage community contents" on public.community_contents;
drop policy if exists "auth users can manage travel products" on public.travel_products;
