-- Five Star CRM — Notes, audit log, and missing columns referenced by the app

-- ============================================================
-- Missing columns referenced by existing code
-- ============================================================

-- reports.admin_notes (used by useReviewReport)
alter table public.reports
  add column if not exists admin_notes text;

-- users.restaurant_id (used by restaurant-role users to scope proforma/reports)
alter table public.users
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete set null;

-- ============================================================
-- T&Cs content (currently referenced by useTcsContent / useUpdateTcs)
-- ============================================================
create table if not exists public.tcs_content (
  id uuid default uuid_generate_v4() primary key,
  content text not null,
  version integer not null,
  created_at timestamptz default now()
);

alter table public.tcs_content enable row level security;

create policy "Anyone can view tcs content" on public.tcs_content
  for select using (auth.uid() is not null);

create policy "Admin can manage tcs content" on public.tcs_content
  for all using (public.current_user_role() = 'admin');

-- ============================================================
-- Restaurant CRM notes (Wendy's notes on her restaurant clients)
-- ============================================================
create table if not exists public.restaurant_notes (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  author_id uuid references public.users(id) on delete set null,
  note_type text not null default 'general' check (note_type in ('general', 'admin', 'commercial')),
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists restaurant_notes_restaurant_idx
  on public.restaurant_notes (restaurant_id, created_at desc);

alter table public.restaurant_notes enable row level security;

create policy "Admin manages restaurant notes" on public.restaurant_notes
  for all using (public.current_user_role() = 'admin');

create policy "Restaurant reads own notes" on public.restaurant_notes
  for select using (
    public.current_user_role() = 'restaurant'
    and restaurant_id = (select restaurant_id from public.users where id = auth.uid())
    and note_type = 'general'
  );

-- ============================================================
-- Diner CRM notes (Wendy's internal notes on diner performance)
-- ============================================================
create table if not exists public.diner_notes (
  id uuid default uuid_generate_v4() primary key,
  diner_id uuid references public.users(id) on delete cascade not null,
  author_id uuid references public.users(id) on delete set null,
  note_type text not null default 'general' check (note_type in ('general', 'admin', 'performance')),
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists diner_notes_diner_idx
  on public.diner_notes (diner_id, created_at desc);

alter table public.diner_notes enable row level security;

create policy "Admin manages diner notes" on public.diner_notes
  for all using (public.current_user_role() = 'admin');

-- ============================================================
-- Audit log — who did what, when
-- ============================================================
create table if not exists public.audit_log (
  id uuid default uuid_generate_v4() primary key,
  actor_id uuid references public.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists audit_log_entity_idx
  on public.audit_log (entity_type, entity_id, created_at desc);
create index if not exists audit_log_actor_idx
  on public.audit_log (actor_id, created_at desc);

alter table public.audit_log enable row level security;

create policy "Admin reads audit log" on public.audit_log
  for select using (public.current_user_role() = 'admin');

create policy "Authenticated can write audit entries" on public.audit_log
  for insert with check (auth.uid() is not null and actor_id = auth.uid());

-- ============================================================
-- Restaurants: CRM-friendly denormalised fields for list views
-- ============================================================
alter table public.restaurants
  add column if not exists last_report_at timestamptz;

alter table public.restaurants
  add column if not exists total_reports integer not null default 0;
