create extension if not exists "pgcrypto";

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text,
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
  submission_status text not null default 'approved' check (submission_status in ('pending', 'approved', 'rejected')),
  submitted_by text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.place_images (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.place_reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  nickname text not null default 'Guest',
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_plans (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  extra_info text,
  submitted_by text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  place_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

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

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  login_id text not null,
  login_id_normalized text not null,
  name text not null,
  phone text not null,
  phone_normalized text not null,
  email text not null,
  email_normalized text not null,
  password_hash text,
  role text not null default 'member' check (role in ('member', 'admin')),
  kakao_id text,
  line_id text,
  telegram_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.travel_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  main_category text not null default '밤문화' check (main_category in ('밤문화')),
  sub_category text not null check (sub_category in ('마사지', '가라오케', '로컬업소', '여행상품')),
  city text not null check (city in ('방콕', '파타야', '치앙마이')),
  price_min numeric(12,2),
  image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_places_district on public.places(district);
create index if not exists idx_places_city on public.places(city);
create index if not exists idx_places_category on public.places(category);
create index if not exists idx_places_latitude on public.places(latitude);
create index if not exists idx_places_longitude on public.places(longitude);
create index if not exists idx_places_published on public.places(is_published);
create index if not exists idx_places_featured on public.places(is_featured);
create index if not exists idx_places_submission_status on public.places(submission_status);
create index if not exists idx_place_images_place_id on public.place_images(place_id);
create index if not exists idx_place_reviews_place_id on public.place_reviews(place_id);
create index if not exists idx_trip_plans_status on public.trip_plans(status);
create index if not exists idx_community_contents_section on public.community_contents(section);
create index if not exists idx_community_contents_sort on public.community_contents(sort_order);
create index if not exists idx_members_name on public.members(name);
create index if not exists idx_members_created_at on public.members(created_at);
create unique index if not exists members_login_id_normalized_key on public.members(login_id_normalized);
create unique index if not exists members_phone_normalized_key on public.members(phone_normalized);
create unique index if not exists members_email_normalized_key on public.members(email_normalized);
create index if not exists idx_travel_products_city on public.travel_products(city);
create index if not exists idx_travel_products_sub_category on public.travel_products(sub_category);
create index if not exists idx_travel_products_published on public.travel_products(is_published);

alter table public.places enable row level security;
alter table public.place_images enable row level security;
alter table public.place_reviews enable row level security;
alter table public.trip_plans enable row level security;
alter table public.community_contents enable row level security;
alter table public.members enable row level security;
alter table public.travel_products enable row level security;

drop policy if exists "public can read published places" on public.places;
create policy "public can read published places"
on public.places for select
using (is_published = true);

drop policy if exists "public can read images of published places" on public.place_images;
create policy "public can read images of published places"
on public.place_images for select
using (
  exists (
    select 1 from public.places p
    where p.id = place_images.place_id
      and p.is_published = true
  )
);

drop policy if exists "public can read reviews" on public.place_reviews;
create policy "public can read reviews"
on public.place_reviews for select
using (true);

drop policy if exists "public can write reviews" on public.place_reviews;
create policy "public can write reviews"
on public.place_reviews for insert
with check (true);

drop policy if exists "public can read plans" on public.trip_plans;
create policy "public can read plans"
on public.trip_plans for select
using (status = 'approved');

drop policy if exists "public can read community contents" on public.community_contents;
create policy "public can read community contents"
on public.community_contents for select
using (true);

drop policy if exists "public can read published travel products" on public.travel_products;
create policy "public can read published travel products"
on public.travel_products for select
using (is_published = true);

drop policy if exists "public can write plans" on public.trip_plans;
create policy "public can write plans"
on public.trip_plans for insert
with check (true);

drop policy if exists "auth users can manage places" on public.places;
drop policy if exists "auth users can manage place_images" on public.place_images;
drop policy if exists "auth users can manage community contents" on public.community_contents;
drop policy if exists "auth users can manage travel products" on public.travel_products;
