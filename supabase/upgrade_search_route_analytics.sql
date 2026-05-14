-- Performance, moderation, routing analytics upgrade (immutable-safe)
-- Uses trigger-maintained tsvector instead of generated column.

create extension if not exists pg_trgm;

alter table if exists public.places
  add column if not exists city text,
  add column if not exists search_document tsvector;

create or replace function public.update_places_search_document()
returns trigger as $$
begin
  new.search_document :=
    to_tsvector(
      'simple',
      coalesce(new.name, '') || ' ' ||
      coalesce(new.description, '') || ' ' ||
      coalesce(new.address, '') || ' ' ||
      coalesce(new.district, '') || ' ' ||
      coalesce(new.category, '') || ' ' ||
      coalesce(array_to_string(new.tags, ' '), '')
    );
  return new;
end
$$ language plpgsql;

drop trigger if exists trg_places_search_document on public.places;
create trigger trg_places_search_document
before insert or update of name, description, address, district, category, tags
on public.places
for each row
execute function public.update_places_search_document();

update public.places
set search_document =
  to_tsvector(
    'simple',
    coalesce(name, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(address, '') || ' ' ||
    coalesce(district, '') || ' ' ||
    coalesce(category, '') || ' ' ||
    coalesce(array_to_string(tags, ' '), '')
  )
where search_document is null;

create index if not exists idx_places_search_document on public.places using gin(search_document);
create index if not exists idx_places_name_trgm on public.places using gin(name gin_trgm_ops);
create index if not exists idx_places_address_trgm on public.places using gin(address gin_trgm_ops);
create index if not exists idx_places_published_filters on public.places(is_published, city, district, category, created_at desc);
create index if not exists idx_places_published_bounds on public.places(is_published, longitude, latitude);

create table if not exists public.place_submission_images (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  image_url text not null,
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_place_submission_images_place_id on public.place_submission_images(place_id);
create index if not exists idx_place_submission_images_status on public.place_submission_images(moderation_status);

create table if not exists public.analytics_events (
  id bigserial primary key,
  event_name text not null,
  path text,
  referrer text,
  session_id text,
  user_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_event_name_created_at on public.analytics_events(event_name, created_at desc);
create index if not exists idx_analytics_events_path_created_at on public.analytics_events(path, created_at desc);
create index if not exists idx_analytics_events_session_id on public.analytics_events(session_id);

alter table public.place_submission_images enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists "public can read approved submission images" on public.place_submission_images;
create policy "public can read approved submission images"
on public.place_submission_images for select
using (
  moderation_status = 'approved'
  and exists (
    select 1 from public.places p
    where p.id = place_submission_images.place_id
      and p.is_published = true
  )
);
