-- ─── Slot waitlist ───────────────────────────────────────────────────────────
create table if not exists slot_waitlist (
  id         uuid primary key default gen_random_uuid(),
  slot_id    uuid not null references slots(id) on delete cascade,
  diner_id   uuid not null references users(id) on delete cascade,
  position   integer not null,
  created_at timestamptz not null default now(),
  unique(slot_id, diner_id)
);

create index if not exists slot_waitlist_slot_idx on slot_waitlist(slot_id, position);
create index if not exists slot_waitlist_diner_idx on slot_waitlist(diner_id);

-- RLS
alter table slot_waitlist enable row level security;

-- Diners can manage their own entries
create policy "Diners manage own waitlist"
  on slot_waitlist for all
  using (diner_id = auth.uid())
  with check (diner_id = auth.uid());

-- Admins can read all
create policy "Admins view all waitlist"
  on slot_waitlist for select
  using (
    exists (select 1 from users where id = auth.uid() and role = 'admin')
  );
