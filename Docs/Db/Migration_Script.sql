-- WedSnap migration
-- Goal:
-- 1. Enable frictionless guest uploads with Supabase anonymous sessions
-- 2. Add secure RPC functions for QR validation and batch/photo registration
-- 3. Enable RLS policies for admins and storage uploads in bucket fotos-boda

alter type public.photo_status add value if not exists 'uploaded';
alter type public.upload_batch_status add value if not exists 'completed';
alter type public.upload_batch_status add value if not exists 'failed';

alter table public.upload_batches
  add column if not exists guest_auth_user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'upload_batches_guest_auth_user_id_fkey'
      and conrelid = 'public.upload_batches'::regclass
  ) then
    alter table public.upload_batches
      add constraint upload_batches_guest_auth_user_id_fkey
      foreign key (guest_auth_user_id) references auth.users (id);
  end if;
end
$$;

create index if not exists idx_upload_batches_guest_auth_user_id
  on public.upload_batches (guest_auth_user_id);

comment on column public.upload_batches.guest_auth_user_id is
'auth.users id used for frictionless anonymous guest uploads.';

create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = p_user_id
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

create or replace function public.get_guest_upload_context(p_token text)
returns table (
  qr_code_id uuid,
  event_id uuid,
  event_title text,
  event_date date,
  table_number integer,
  table_label text,
  guest_group_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    qr.id,
    qr.event_id,
    e.title,
    e.event_date,
    qr.table_number,
    qr.table_label,
    qr.guest_group_name
  from public.qr_codes as qr
  inner join public.events as e
    on e.id = qr.event_id
  where qr.token = btrim(p_token)
    and qr.is_active = true
    and e.is_active = true
  limit 1;

  if not found then
    raise exception 'No se encontro una mesa activa para este codigo QR.';
  end if;
end;
$$;

revoke all on function public.get_guest_upload_context(text) from public;
grant execute on function public.get_guest_upload_context(text) to authenticated;

create or replace function public.start_guest_upload(
  p_token text,
  p_guest_name text,
  p_guest_session_id uuid,
  p_user_agent_raw text default null,
  p_browser_name text default null,
  p_browser_version text default null,
  p_os_name text default null,
  p_os_version text default null,
  p_device_type text default null,
  p_device_vendor text default null,
  p_device_model text default null,
  p_screen_width integer default null,
  p_screen_height integer default null,
  p_pixel_ratio numeric default null,
  p_language text default null,
  p_timezone text default null,
  p_network_type text default null,
  p_referrer text default null
)
returns table (
  batch_id uuid,
  event_id uuid,
  qr_code_id uuid,
  event_title text,
  table_number integer,
  table_label text,
  guest_group_name text,
  storage_prefix text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_qr_code_id uuid;
  v_event_id uuid;
  v_event_title text;
  v_table_number integer;
  v_table_label text;
  v_guest_group_name text;
  v_batch_id uuid;
begin
  if v_auth_user_id is null then
    raise exception 'No existe una sesion de invitado valida.';
  end if;

  select
    qr.id,
    qr.event_id,
    e.title,
    qr.table_number,
    qr.table_label,
    qr.guest_group_name
  into
    v_qr_code_id,
    v_event_id,
    v_event_title,
    v_table_number,
    v_table_label,
    v_guest_group_name
  from public.qr_codes as qr
  inner join public.events as e
    on e.id = qr.event_id
  where qr.token = btrim(p_token)
    and qr.is_active = true
    and e.is_active = true
  limit 1;

  if v_qr_code_id is null then
    raise exception 'No se encontro una mesa activa para este codigo QR.';
  end if;

  insert into public.upload_batches (
    event_id,
    qr_code_id,
    guest_name,
    guest_session_id,
    guest_auth_user_id,
    status,
    photo_count,
    user_agent_raw,
    browser_name,
    browser_version,
    os_name,
    os_version,
    device_type,
    device_vendor,
    device_model,
    screen_width,
    screen_height,
    pixel_ratio,
    language,
    timezone,
    network_type,
    referrer
  )
  values (
    v_event_id,
    v_qr_code_id,
    btrim(p_guest_name),
    p_guest_session_id,
    v_auth_user_id,
    'pending',
    0,
    p_user_agent_raw,
    p_browser_name,
    p_browser_version,
    p_os_name,
    p_os_version,
    p_device_type,
    p_device_vendor,
    p_device_model,
    p_screen_width,
    p_screen_height,
    p_pixel_ratio,
    p_language,
    p_timezone,
    p_network_type,
    p_referrer
  )
  returning id into v_batch_id;

  update public.qr_codes
  set
    scan_count = scan_count + 1,
    last_scanned_at = timezone('utc', now())
  where id = v_qr_code_id;

  return query
  select
    v_batch_id,
    v_event_id,
    v_qr_code_id,
    v_event_title,
    v_table_number,
    v_table_label,
    v_guest_group_name,
    format('%s/%s', v_auth_user_id, v_batch_id);
end;
$$;

revoke all on function public.start_guest_upload(
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer,
  numeric,
  text,
  text,
  text,
  text
) from public;

grant execute on function public.start_guest_upload(
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer,
  numeric,
  text,
  text,
  text,
  text
) to authenticated;

create or replace function public.register_uploaded_photo(
  p_batch_id uuid,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_file_extension text,
  p_file_size_bytes bigint,
  p_width integer default null,
  p_height integer default null,
  p_captured_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_photo_id uuid;
begin
  if v_auth_user_id is null then
    raise exception 'No existe una sesion valida para registrar fotos.';
  end if;

  if not exists (
    select 1
    from public.upload_batches
    where id = p_batch_id
      and (
        guest_auth_user_id = v_auth_user_id
        or public.is_admin(v_auth_user_id)
      )
  ) then
    raise exception 'No tienes permiso para registrar fotos en este lote.';
  end if;

  insert into public.photos (
    batch_id,
    storage_path,
    original_filename,
    mime_type,
    file_extension,
    file_size_bytes,
    width,
    height,
    captured_at,
    status
  )
  values (
    p_batch_id,
    p_storage_path,
    p_original_filename,
    p_mime_type,
    p_file_extension,
    p_file_size_bytes,
    p_width,
    p_height,
    p_captured_at,
    'uploaded'
  )
  returning id into v_photo_id;

  return v_photo_id;
end;
$$;

revoke all on function public.register_uploaded_photo(
  uuid,
  text,
  text,
  text,
  text,
  bigint,
  integer,
  integer,
  timestamptz
) from public;

grant execute on function public.register_uploaded_photo(
  uuid,
  text,
  text,
  text,
  text,
  bigint,
  integer,
  integer,
  timestamptz
) to authenticated;

create or replace function public.finish_guest_upload(
  p_batch_id uuid,
  p_photo_count integer,
  p_status public.upload_batch_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
begin
  if v_auth_user_id is null then
    raise exception 'No existe una sesion valida para cerrar el lote.';
  end if;

  update public.upload_batches
  set
    photo_count = greatest(0, least(p_photo_count, 10)),
    status = p_status,
    completed_at = timezone('utc', now())
  where id = p_batch_id
    and (
      guest_auth_user_id = v_auth_user_id
      or public.is_admin(v_auth_user_id)
    );

  if not found then
    raise exception 'No tienes permiso para cerrar este lote.';
  end if;
end;
$$;

revoke all on function public.finish_guest_upload(uuid, integer, public.upload_batch_status) from public;
grant execute on function public.finish_guest_upload(uuid, integer, public.upload_batch_status) to authenticated;

alter table public.admin_profiles enable row level security;
alter table public.events enable row level security;
alter table public.qr_codes enable row level security;
alter table public.upload_batches enable row level security;
alter table public.photos enable row level security;

-- Supabase Storage already manages RLS on storage.objects.
-- We only define the policies we need below.

drop policy if exists admin_profiles_select_self_or_admin on public.admin_profiles;
create policy admin_profiles_select_self_or_admin
  on public.admin_profiles
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_admin(auth.uid())
  );

drop policy if exists admin_profiles_admin_manage_all on public.admin_profiles;
create policy admin_profiles_admin_manage_all
  on public.admin_profiles
  for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists events_admin_all on public.events;
create policy events_admin_all
  on public.events
  for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists qr_codes_admin_all on public.qr_codes;
create policy qr_codes_admin_all
  on public.qr_codes
  for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists upload_batches_admin_all on public.upload_batches;
create policy upload_batches_admin_all
  on public.upload_batches
  for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists photos_admin_all on public.photos;
create policy photos_admin_all
  on public.photos
  for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists storage_guest_upload_insert_fotos_boda on storage.objects;
create policy storage_guest_upload_insert_fotos_boda
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'fotos-boda'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists storage_guest_upload_delete_own_fotos_boda on storage.objects;
create policy storage_guest_upload_delete_own_fotos_boda
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'fotos-boda'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists storage_admin_read_fotos_boda on storage.objects;
create policy storage_admin_read_fotos_boda
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'fotos-boda'
    and public.is_admin(auth.uid())
  );

drop policy if exists storage_admin_delete_fotos_boda on storage.objects;
create policy storage_admin_delete_fotos_boda
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'fotos-boda'
    and public.is_admin(auth.uid())
  );
