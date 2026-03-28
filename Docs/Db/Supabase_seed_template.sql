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
insert into public.admin_profiles (
  user_id,
  full_name,
  role
)
values (
  '00000000-0000-0000-0000-000000000000',
  'Sebastian Chairez',
  'owner'
)
on conflict (user_id) do update
set
  full_name = excluded.full_name,
  role = excluded.role;

-- 3. Generate QR codes for tables
with target_event as (
  select id
  from public.events
  where slug = 'your-event-slug'
)
insert into public.qr_codes (
  event_id,
  table_label,
  token,
  is_active
)
select
  target_event.id,
  format('Mesa %s', table_number),
  public.generate_qr_token(18),
  true
from target_event
cross join generate_series(1, 20) as table_number
on conflict (event_id, table_label) do nothing;

-- 4. Check the generated QR rows
select
  table_label,
  token,
  is_active
from public.qr_codes
where event_id = (
  select id
  from public.events
  where slug = 'your-event-slug'
)
order by table_label;
