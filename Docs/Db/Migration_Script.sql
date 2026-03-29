-- WeddVue migration
-- Goal:
-- 1. Move from single-event admin flow to account-owned multi-event dashboard
-- 2. Keep frictionless guest uploads through anonymous Supabase sessions
-- 3. Align RLS for owners, optional super-admins, and private storage access

alter type public.photo_status add value if not exists 'uploaded';
alter type public.upload_batch_status add value if not exists 'completed';
alter type public.upload_batch_status add value if not exists 'failed';

alter table public.events
  add column if not exists owner_user_id uuid;

alter table public.upload_batches
  add column if not exists guest_auth_user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_owner_user_id_fkey'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_owner_user_id_fkey
      foreign key (owner_user_id) references auth.users (id);
  end if;

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

do $$
declare
  fallback_owner_id uuid;
begin
  select user_id
  into fallback_owner_id
  from public.admin_profiles
  order by created_at asc
  limit 1;

  if fallback_owner_id is not null then
    update public.events
    set owner_user_id = fallback_owner_id
    where owner_user_id is null;
  end if;

  if exists (
    select 1
    from public.events
    where owner_user_id is null
  ) then
    raise exception 'Existen eventos sin owner_user_id. Asigna un propietario antes de continuar.';
  end if;
end
$$;

alter table public.events
  alter column owner_user_id set not null;

create index if not exists idx_events_owner_user_id
  on public.events (owner_user_id);

create index if not exists idx_upload_batches_guest_auth_user_id
  on public.upload_batches (guest_auth_user_id);

comment on column public.events.owner_user_id is
'auth.users id of the account that owns the event.';

comment on column public.upload_batches.guest_auth_user_id is
'auth.users id used for frictionless anonymous guest uploads.';

create or replace function public.generate_qr_token(token_length integer default 18)
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  token text := '';
  target_length integer := greatest(coalesce(token_length, 18), 12);
begin
  for index in 1..target_length loop
    token := token || substr(chars, 1 + floor(random() * length(chars))::integer, 1);
  end loop;

  return token;
end;
$$;

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

create or replace function public.is_event_owner(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events
    where id = p_event_id
      and (
        owner_user_id = p_user_id
        or public.is_admin(p_user_id)
      )
  );
$$;

revoke all on function public.is_event_owner(uuid, uuid) from public;
grant execute on function public.is_event_owner(uuid, uuid) to authenticated;

create or replace function public.can_manage_upload_batch(p_batch_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.upload_batches as ub
    inner join public.events as e
      on e.id = ub.event_id
    where ub.id = p_batch_id
      and (
        ub.guest_auth_user_id = p_user_id
        or e.owner_user_id = p_user_id
        or public.is_admin(p_user_id)
      )
  );
$$;

revoke all on function public.can_manage_upload_batch(uuid, uuid) from public;
grant execute on function public.can_manage_upload_batch(uuid, uuid) to authenticated;

create or replace function public.can_manage_photo(p_photo_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.photos as p
    inner join public.upload_batches as ub
      on ub.id = p.batch_id
    inner join public.events as e
      on e.id = ub.event_id
    where p.id = p_photo_id
      and (
        e.owner_user_id = p_user_id
        or public.is_admin(p_user_id)
      )
  );
$$;

revoke all on function public.can_manage_photo(uuid, uuid) from public;
grant execute on function public.can_manage_photo(uuid, uuid) to authenticated;

create or replace function public.can_manage_storage_object(p_object_name text, p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  batch_id_text text;
  batch_id uuid;
begin
  batch_id_text := nullif(split_part(coalesce(p_object_name, ''), '/', 2), '');

  if batch_id_text is null then
    return false;
  end if;

  begin
    batch_id := batch_id_text::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  return exists (
    select 1
    from public.upload_batches as ub
    inner join public.events as e
      on e.id = ub.event_id
    where ub.id = batch_id
      and (
        e.owner_user_id = p_user_id
        or public.is_admin(p_user_id)
      )
  );
end;
$$;

revoke all on function public.can_manage_storage_object(text, uuid) from public;
grant execute on function public.can_manage_storage_object(text, uuid) to authenticated;

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

  if not public.can_manage_upload_batch(p_batch_id, v_auth_user_id) then
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
    and public.can_manage_upload_batch(p_batch_id, v_auth_user_id);

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
drop policy if exists events_account_all on public.events;
create policy events_account_all
  on public.events
  for all
  to authenticated
  using (
    owner_user_id = auth.uid()
    or public.is_admin(auth.uid())
  )
  with check (
    owner_user_id = auth.uid()
    or public.is_admin(auth.uid())
  );

drop policy if exists qr_codes_admin_all on public.qr_codes;
drop policy if exists qr_codes_account_all on public.qr_codes;
create policy qr_codes_account_all
  on public.qr_codes
  for all
  to authenticated
  using (public.is_event_owner(event_id, auth.uid()))
  with check (public.is_event_owner(event_id, auth.uid()));

drop policy if exists upload_batches_admin_all on public.upload_batches;
drop policy if exists upload_batches_account_all on public.upload_batches;
create policy upload_batches_account_all
  on public.upload_batches
  for all
  to authenticated
  using (public.is_event_owner(event_id, auth.uid()))
  with check (public.is_event_owner(event_id, auth.uid()));

drop policy if exists photos_admin_all on public.photos;
drop policy if exists photos_account_all on public.photos;
create policy photos_account_all
  on public.photos
  for all
  to authenticated
  using (public.can_manage_photo(id, auth.uid()))
  with check (public.can_manage_photo(id, auth.uid()));

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
drop policy if exists storage_owner_read_fotos_boda on storage.objects;
create policy storage_owner_read_fotos_boda
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'fotos-boda'
    and public.can_manage_storage_object(name, auth.uid())
  );

drop policy if exists storage_admin_delete_fotos_boda on storage.objects;
drop policy if exists storage_owner_delete_fotos_boda on storage.objects;
create policy storage_owner_delete_fotos_boda
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'fotos-boda'
    and public.can_manage_storage_object(name, auth.uid())
  );
