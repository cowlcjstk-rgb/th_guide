-- Link member-owned submissions for "My submitted places/routes" pages.
-- Safe to run multiple times.

alter table if exists public.places
  add column if not exists submitted_by_member_id uuid;

alter table if exists public.trip_plans
  add column if not exists submitted_by_member_id uuid;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'members') then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'places_submitted_by_member_id_fkey'
    ) then
      alter table public.places
        add constraint places_submitted_by_member_id_fkey
        foreign key (submitted_by_member_id) references public.members(id) on delete set null;
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'trip_plans_submitted_by_member_id_fkey'
    ) then
      alter table public.trip_plans
        add constraint trip_plans_submitted_by_member_id_fkey
        foreign key (submitted_by_member_id) references public.members(id) on delete set null;
    end if;
  end if;
end $$;

create index if not exists idx_places_submitted_by_member_id
  on public.places(submitted_by_member_id);

create index if not exists idx_trip_plans_submitted_by_member_id
  on public.trip_plans(submitted_by_member_id);

