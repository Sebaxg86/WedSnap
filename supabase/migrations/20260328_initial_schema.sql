-- Keep this migration aligned with Docs/Database_schema.sql

create extension if not exists pgcrypto;

do $$
begin
  create type public.upload_batch_status as enum (
    'pending',
    'uploading',
    'completed',
    'partial',
    'failed',
    'blocked'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.photo_status as enum (
    'pending',
    'uploaded',
    'ready',
    'rejected',
    'deleted'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  event_date date,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('admin', 'owner')),
  created_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  table_label text not null,
  token text not null unique check (char_length(token) >= 12),
  is_active boolean not null default true,
  notes text,
  scan_count integer not null default 0 check (scan_count >= 0),
  last_scanned_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc', now()),
  unique (event_id, table_label)
);

create table if not exists public.upload_batches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  qr_code_id uuid not null references public.qr_codes (id) on delete restrict,
  guest_name text not null check (char_length(btrim(guest_name)) between 1 and 120),
  guest_session_id uuid not null default gen_random_uuid(),
  status public.upload_batch_status not null default 'pending',
  photo_count integer not null default 0 check (photo_count between 0 and 10),
  created_at timestamp with time zone not null default timezone('utc', now()),
  completed_at timestamp with time zone,
  user_agent_raw text,
  browser_name text,
  browser_version text,
  os_name text,
  os_version text,
  device_type text,
  device_vendor text,
  device_model text,
  screen_width integer check (screen_width is null or screen_width > 0),
  screen_height integer check (screen_height is null or screen_height > 0),
  pixel_ratio numeric(4,2) check (pixel_ratio is null or pixel_ratio > 0),
  language text,
  timezone text,
  network_type text,
  ip_hash text,
  referrer text
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.upload_batches (id) on delete cascade,
  storage_bucket text not null default 'fotos-boda',
  storage_path text not null unique,
  original_filename text,
  mime_type text not null,
  file_extension text,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  captured_at timestamp with time zone,
  status public.photo_status not null default 'pending',
  is_favorite boolean not null default false,
  sha256 text,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
  );
$$;

create or replace function public.generate_qr_token(token_length integer default 18)
returns text
language plpgsql
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  result text := '';
  idx integer;
begin
  if token_length < 12 then
    raise exception 'QR token length must be at least 12 characters.';
  end if;

  for idx in 1..token_length loop
    result := result || substr(chars, 1 + floor(random() * length(chars))::integer, 1);
  end loop;

  return result;
end;
$$;

create or replace function public.enforce_photo_limit()
returns trigger
language plpgsql
as $$
declare
  current_count integer;
begin
  perform 1
  from public.upload_batches
  where id = new.batch_id
  for update;

  select count(*)
  into current_count
  from public.photos
  where batch_id = new.batch_id;

  if current_count >= 10 then
    raise exception 'A batch cannot contain more than 10 photos.';
  end if;

  return new;
end;
$$;

create or replace function public.sync_batch_photo_count()
returns trigger
language plpgsql
as $$
declare
  target_batch_id uuid;
begin
  target_batch_id := coalesce(new.batch_id, old.batch_id);

  update public.upload_batches
  set photo_count = (
    select count(*)::integer
    from public.photos
    where batch_id = target_batch_id
  )
  where id = target_batch_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_photos_enforce_limit on public.photos;
create trigger trg_photos_enforce_limit
before insert on public.photos
for each row
execute function public.enforce_photo_limit();

drop trigger if exists trg_photos_sync_batch_count on public.photos;
create trigger trg_photos_sync_batch_count
after insert or delete on public.photos
for each row
execute function public.sync_batch_photo_count();

create index if not exists idx_qr_codes_event_id
  on public.qr_codes (event_id);

create index if not exists idx_upload_batches_event_id
  on public.upload_batches (event_id);

create index if not exists idx_upload_batches_qr_code_id
  on public.upload_batches (qr_code_id);

create index if not exists idx_upload_batches_guest_name
  on public.upload_batches (guest_name);

create index if not exists idx_upload_batches_created_at
  on public.upload_batches (created_at desc);

create index if not exists idx_photos_batch_id
  on public.photos (batch_id);

create index if not exists idx_photos_status
  on public.photos (status);

create index if not exists idx_photos_created_at
  on public.photos (created_at desc);

alter table public.events enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.qr_codes enable row level security;
alter table public.upload_batches enable row level security;
alter table public.photos enable row level security;

drop policy if exists "Admins can read events" on public.events;
create policy "Admins can read events"
on public.events
for select
using (public.is_admin());

drop policy if exists "Admins can insert events" on public.events;
create policy "Admins can insert events"
on public.events
for insert
with check (public.is_admin());

drop policy if exists "Admins can update events" on public.events;
create policy "Admins can update events"
on public.events
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read admin profiles" on public.admin_profiles;
create policy "Admins can read admin profiles"
on public.admin_profiles
for select
using (public.is_admin() or auth.uid() = user_id);

drop policy if exists "Admins can read qr codes" on public.qr_codes;
create policy "Admins can read qr codes"
on public.qr_codes
for select
using (public.is_admin());

drop policy if exists "Admins can insert qr codes" on public.qr_codes;
create policy "Admins can insert qr codes"
on public.qr_codes
for insert
with check (public.is_admin());

drop policy if exists "Admins can update qr codes" on public.qr_codes;
create policy "Admins can update qr codes"
on public.qr_codes
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read upload batches" on public.upload_batches;
create policy "Admins can read upload batches"
on public.upload_batches
for select
using (public.is_admin());

drop policy if exists "Admins can update upload batches" on public.upload_batches;
create policy "Admins can update upload batches"
on public.upload_batches
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read photos" on public.photos;
create policy "Admins can read photos"
on public.photos
for select
using (public.is_admin());

drop policy if exists "Admins can update photos" on public.photos;
create policy "Admins can update photos"
on public.photos
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete photos" on public.photos;
create policy "Admins can delete photos"
on public.photos
for delete
using (public.is_admin());

drop policy if exists "Admins can read wedding bucket objects" on storage.objects;
create policy "Admins can read wedding bucket objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'fotos-boda'
  and public.is_admin()
);

drop policy if exists "Admins can delete wedding bucket objects" on storage.objects;
create policy "Admins can delete wedding bucket objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'fotos-boda'
  and public.is_admin()
);
