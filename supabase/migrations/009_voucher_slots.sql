-- ─── Voucher-based slot workflow ────────────────────────────────────────────
-- Real 5StarX workflow doesn't have fixed dine date/times — Wendy posts a
-- voucher opportunity with an expiry, diners apply, diner books the actual
-- date/time privately with the restaurant after approval.
--
-- This migration is additive: legacy `slots.date`/`slots.time` are kept
-- (nullable now) so existing seed data still works. New slots created
-- through the admin UI use `voucher_expiry` + `notes` only.

-- 1. Voucher opportunity fields on slots
alter table public.slots
  add column if not exists voucher_expiry date,
  add column if not exists notes text;

-- 2. Legacy date/time become optional (new voucher-only slots leave them null)
alter table public.slots alter column date drop not null;
alter table public.slots alter column time drop not null;

-- 3. Booking fields on assignments — diner enters after Wendy approves
alter table public.assignments
  add column if not exists booking_date date,
  add column if not exists booking_time time,
  add column if not exists booking_notes text;

comment on column public.slots.voucher_expiry is
  'Deadline by which the voucher must be used. Replaces fixed date/time.';
comment on column public.slots.notes is
  'Wendy''s notes on the voucher opportunity, shown to diners browsing.';
comment on column public.assignments.booking_date is
  'Actual dine date the diner booked with the restaurant after approval.';
comment on column public.assignments.booking_time is
  'Actual dine time the diner booked with the restaurant after approval.';
comment on column public.assignments.booking_notes is
  'Diner''s notes about their booking (party size, allergies, etc.).';

-- 4. Rebuild overdue_reports view to prefer the actual booking over legacy slot date
create or replace view public.overdue_reports as
with dine_time as (
  select
    a.id                               as assignment_id,
    a.diner_id,
    a.slot_id,
    a.status                           as assignment_status,
    coalesce(
      (a.booking_date + a.booking_time)::timestamptz,
      (s.date + s.time)::timestamptz
    )                                  as dine_at,
    s.restaurant_id
  from public.assignments a
  join public.slots s on s.id = a.slot_id
)
select
  dt.assignment_id,
  dt.diner_id,
  u.name                              as diner_name,
  u.email                             as diner_email,
  dt.slot_id,
  dt.restaurant_id,
  rest.name                           as restaurant_name,
  dt.dine_at,
  dt.dine_at + interval '48 hours'    as deadline_at,
  now() - (dt.dine_at + interval '48 hours') as overdue_by,
  r.id                                as report_id,
  r.status                            as report_status
from dine_time dt
join public.users u on u.id = dt.diner_id
join public.restaurants rest on rest.id = dt.restaurant_id
left join public.reports r on r.assignment_id = dt.assignment_id
where dt.assignment_status in ('confirmed', 'claimed')
  and dt.dine_at is not null
  and dt.dine_at + interval '48 hours' < now()
  and (r.id is null or r.status in ('draft', 'submitted'));

grant select on public.overdue_reports to authenticated;
