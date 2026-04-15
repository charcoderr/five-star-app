-- ─── Report workflow extensions ─────────────────────────────────────────────
-- Adds the two-step approval flow Charlotte spec'd:
--   Submitted → Under Review → Sent to Restaurant
-- Restaurants only ever see `sent_to_restaurant` reports. Also adds an
-- `overdue_reports` view used by the admin dashboard.

-- 1. Expand the status check constraint
alter table public.reports
  drop constraint if exists reports_status_check;

-- Migrate legacy 'reviewed' rows (old one-step flow) to 'sent_to_restaurant'.
-- Semantically: if Wendy had already reviewed it, the restaurant was meant to
-- see it.
update public.reports
set status = 'sent_to_restaurant'
where status = 'reviewed';

alter table public.reports
  add constraint reports_status_check
  check (status in ('draft', 'submitted', 'under_review', 'sent_to_restaurant'));

-- 2. RLS — restaurant users read only their own restaurant's approved reports
drop policy if exists "Restaurants read own approved reports" on public.reports;
create policy "Restaurants read own approved reports" on public.reports
  for select using (
    public.current_user_role() = 'restaurant'
    and status = 'sent_to_restaurant'
    and restaurant_id = (
      select u.restaurant_id from public.users u where u.id = auth.uid()
    )
  );

-- 3. Overdue reports view
-- Definition: dine has happened (slots.date + slots.time is in the past) and
-- no report has been submitted within 48 hours of it. Any assignment where
-- the linked report is still draft / null past that threshold counts as
-- overdue.
create or replace view public.overdue_reports as
select
  a.id                               as assignment_id,
  a.diner_id,
  u.name                             as diner_name,
  u.email                            as diner_email,
  s.id                               as slot_id,
  s.restaurant_id,
  rest.name                          as restaurant_name,
  (s.date + s.time)::timestamptz     as dine_at,
  (s.date + s.time)::timestamptz
    + interval '48 hours'            as deadline_at,
  now() - ((s.date + s.time)::timestamptz + interval '48 hours') as overdue_by,
  r.id                               as report_id,
  r.status                           as report_status
from public.assignments a
join public.slots s        on s.id = a.slot_id
join public.users u        on u.id = a.diner_id
join public.restaurants rest on rest.id = s.restaurant_id
left join public.reports r on r.assignment_id = a.id
where a.status in ('confirmed', 'claimed')
  and (s.date + s.time)::timestamptz + interval '48 hours' < now()
  and (r.id is null or r.status in ('draft', 'submitted'));

comment on view public.overdue_reports is
  'Assignments where the dine has happened, 48h grace has passed, and no submitted/approved report exists yet. Used by admin dashboard.';

grant select on public.overdue_reports to authenticated;
