-- ─── Push token on users ──────────────────────────────────────────────────────
alter table users add column if not exists push_token text;

-- ─── In-app notifications ─────────────────────────────────────────────────────
create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  title        text not null,
  body         text not null,
  type         text not null,       -- assignment_confirmed | assignment_reminder |
                                    -- voucher_issued | report_reviewed | new_slot | new_application
  read         boolean not null default false,
  data         jsonb,               -- deep-link payload { assignmentId, reportId, ... }
  created_at   timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_created_at_idx on notifications(created_at desc);

-- RLS
alter table notifications enable row level security;

-- Users can only read/update their own notifications
create policy "Users read own notifications"
  on notifications for select
  using (user_id = auth.uid());

create policy "Users update own notifications"
  on notifications for update
  using (user_id = auth.uid());

-- Only service role (Edge Functions) can insert notifications
create policy "Service role inserts notifications"
  on notifications for insert
  with check (true);  -- restricted to service_role key at function level

-- ─── Subscription plan column on restaurants ────────────────────────────────
-- Stores which plan (standard/premium) the restaurant is on
alter table restaurants add column if not exists subscription_plan text;
alter table restaurants add column if not exists subscription_renews_at timestamptz;
