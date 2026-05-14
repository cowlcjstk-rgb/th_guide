create table if not exists public.member_saved_places (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(member_id, place_id)
);

create index if not exists idx_member_saved_places_member on public.member_saved_places(member_id, created_at desc);
create index if not exists idx_member_saved_places_place on public.member_saved_places(place_id);

alter table public.member_saved_places enable row level security;

drop policy if exists "public cannot read member saved places" on public.member_saved_places;
create policy "public cannot read member saved places"
on public.member_saved_places for select
using (false);

drop policy if exists "public cannot write member saved places" on public.member_saved_places;
create policy "public cannot write member saved places"
on public.member_saved_places for insert
with check (false);
