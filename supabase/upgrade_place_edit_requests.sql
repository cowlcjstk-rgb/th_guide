create table if not exists public.place_edit_requests (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  requested_changes jsonb not null,
  reason text,
  submitted_by text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_place_edit_requests_place_id on public.place_edit_requests(place_id);
create index if not exists idx_place_edit_requests_status on public.place_edit_requests(status);
create index if not exists idx_place_edit_requests_created_at on public.place_edit_requests(created_at desc);

alter table public.place_edit_requests enable row level security;

drop policy if exists "public can create place edit requests" on public.place_edit_requests;
create policy "public can create place edit requests"
on public.place_edit_requests for insert
with check (true);

drop policy if exists "public can read own pending place edit requests" on public.place_edit_requests;
create policy "public can read own pending place edit requests"
on public.place_edit_requests for select
using (false);
