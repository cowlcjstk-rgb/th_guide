-- Place submission image metadata + usage function
-- Run this once in Supabase SQL Editor.

alter table if exists public.place_submission_images
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  add column if not exists uploaded_by_member_id uuid references public.members(id) on delete set null;

create index if not exists idx_place_submission_images_created_at
  on public.place_submission_images(created_at desc);

create index if not exists idx_place_submission_images_storage_path
  on public.place_submission_images(storage_path);

create unique index if not exists uq_place_submission_images_bucket_path
  on public.place_submission_images(storage_bucket, storage_path)
  where storage_bucket is not null and storage_path is not null;

create or replace function public.get_place_submission_image_usage_bytes()
returns bigint
language sql
stable
as $$
  select coalesce(sum(file_size_bytes), 0)::bigint
  from public.place_submission_images
$$;
