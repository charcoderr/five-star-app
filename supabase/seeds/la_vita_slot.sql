-- ─── Seed: La Vita open slot + test diner ──────────────────────────────────
-- Creates one slot at La Vita tomorrow 19:00 so an admin can watch the full
-- diner → report → review lifecycle without manually creating a slot every time.
--
-- The test diner is created via Supabase auth admin API (not SQL) so passwords
-- hash correctly — see the bash block after this file for the auth call.
--
-- Apply with:
--   supabase db query --linked --file supabase/seeds/la_vita_slot.sql

insert into public.slots (id, restaurant_id, voucher_expiry, notes, max_covers, status, created_by)
select
  'bbbbbbbb-1111-4000-8000-000000000001',
  'aaaaaaaa-1111-4000-8000-000000000001',
  (current_date + interval '60 days')::date,
  'Dinner for up to 2 guests. Book directly with the restaurant at a time that suits you.',
  2,
  'open',
  (select id from public.users where role = 'admin' limit 1)
on conflict (id) do update set
  voucher_expiry = excluded.voucher_expiry,
  notes = excluded.notes,
  status = 'open';

-- Verify
select
  s.id,
  r.name as restaurant,
  s.date,
  s.time,
  s.max_covers,
  s.status
from public.slots s
left join public.restaurants r on r.id = s.restaurant_id
where s.id = 'bbbbbbbb-1111-4000-8000-000000000001';
