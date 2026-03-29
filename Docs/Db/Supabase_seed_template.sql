-- WedSnap seed template
-- Replace the placeholder values before running.

-- 1. Create or update the event
insert into public.events (
  slug,
  title,
  event_date,
  is_active
)
values (
  'your-event-slug',
  'Your Wedding Title',
  '2026-12-31',
  true
)
on conflict (slug) do update
set
  title = excluded.title,
  event_date = excluded.event_date,
  is_active = excluded.is_active;

-- 2. Link your first admin after creating the account in Supabase Auth
-- Replace the email below with the real admin email that already exists in auth.users
do $$
declare
  admin_user_id uuid;
begin
  select id
  into admin_user_id
  from auth.users
  where email = 'usuario@correo.com';

  if admin_user_id is null then
    raise exception 'No auth.users record was found for the provided admin email.';
  end if;

  insert into public.admin_profiles (
    user_id,
    full_name,
    role
  )
  values (
    admin_user_id,
    'Sebastian Chairez',
    'owner'
  )
  on conflict (user_id) do update
  set
    full_name = excluded.full_name,
    role = excluded.role;
end
$$;

-- 3. Generate QR codes for tables
with target_event as (
  select id
  from public.events
  where slug = 'your-event-slug'
)
insert into public.qr_codes (
  event_id,
  table_number,
  table_label,
  guest_group_name,
  token,
  is_active
)
select
  target_event.id,
  table_number,
  format('Mesa %s', table_number),
  null,
  public.generate_qr_token(18),
  true
from target_event
cross join generate_series(1, 20) as table_number
on conflict (event_id, table_number) do update
set
  table_label = excluded.table_label,
  is_active = excluded.is_active;

-- 4. Check the generated QR rows
select
  table_number,
  table_label,
  guest_group_name,
  token,
  is_active
from public.qr_codes
where event_id = (
  select id
  from public.events
  where slug = 'your-event-slug'
)
order by table_number;
