-- ─── AI summaries for reports ────────────────────────────────────────────────
-- Populated by the summarise-report Edge Function when a report is submitted.
--   ai_summary          — 2-3 sentence plain-English summary of the visit
--   ai_flags            — jsonb array of urgent issue strings (e.g. ["hygiene", "rude staff"])
--   ai_recommendations  — constructive "focus areas" text Wendy can edit before publishing

alter table public.reports
  add column if not exists ai_summary text;

alter table public.reports
  add column if not exists ai_flags jsonb default '[]'::jsonb;

alter table public.reports
  add column if not exists ai_recommendations text;

-- Helpful index for the scheduled-reminders Edge Function:
-- filtering assignments by slot date + notification flags.
alter table public.assignments
  add column if not exists reminder_24h_sent_at timestamptz;

alter table public.assignments
  add column if not exists reminder_morning_sent_at timestamptz;

create index if not exists assignments_reminder_24h_idx
  on public.assignments (reminder_24h_sent_at)
  where reminder_24h_sent_at is null;

create index if not exists assignments_reminder_morning_idx
  on public.assignments (reminder_morning_sent_at)
  where reminder_morning_sent_at is null;
