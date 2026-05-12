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
  place_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_places_district on public.places(district);
create index if not exists idx_places_category on public.places(category);
create index if not exists idx_places_published on public.places(is_published);
create index if not exists idx_places_featured on public.places(is_featured);
create index if not exists idx_place_images_place_id on public.place_images(place_id);
create index if not exists idx_place_reviews_place_id on public.place_reviews(place_id);

alter table public.places enable row level security;
alter table public.place_images enable row level security;
alter table public.place_reviews enable row level security;
alter table public.trip_plans enable row level security;

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
using (true);

drop policy if exists "public can write plans" on public.trip_plans;
create policy "public can write plans"
on public.trip_plans for insert
with check (true);

drop policy if exists "auth users can manage places" on public.places;
create policy "auth users can manage places"
on public.places for all
to authenticated
using (true)
with check (true);

drop policy if exists "auth users can manage place_images" on public.place_images;
create policy "auth users can manage place_images"
on public.place_images for all
to authenticated
using (true)
with check (true);
