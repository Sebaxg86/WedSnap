-- WeddVue seed template
-- Replace the placeholder values before running.
-- This template is optional now that owners can create events from the dashboard.

do $$
declare
  owner_user_id uuid;
begin
  select id
  into owner_user_id
  from auth.users
  where email = 'usuario@correo.com';

  if owner_user_id is null then
    raise exception 'No auth.users record was found for the provided owner email.';
  end if;

  insert into public.events (
    owner_user_id,
    slug,
    title,
    event_date,
    is_active
  )
  values (
    owner_user_id,
    'your-event-slug',
    'Your Wedding Title',
    '2026-12-31',
    true
  )
  on conflict (slug) do update
  set
    owner_user_id = excluded.owner_user_id,
    title = excluded.title,
    event_date = excluded.event_date,
    is_active = excluded.is_active;
end
$$;

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
