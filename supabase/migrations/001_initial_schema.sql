-- Five Star Mystery Dines — Initial Schema

-- Uses gen_random_uuid() (built-in pgcrypto/PG13+, no extension needed)

-- Users (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  role text not null check (role in ('admin', 'diner', 'restaurant')),
  name text not null,
  phone text,
  city text,
  status text not null default 'active' check (status in ('active', 'pending_approval', 'suspended')),
  application jsonb,
  created_at timestamptz default now()
);

-- Restaurants
create table public.restaurants (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text,
  cuisine_type text,
  contact_email text,
  subscription_status text not null default 'inactive' check (subscription_status in ('active', 'inactive', 'trial')),
  avg_rating numeric(3,2),
  created_at timestamptz default now()
);

-- Slots (available mystery dine opportunities)
create table public.slots (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  date date not null,
  time time not null,
  max_covers integer not null default 2,
  status text not null default 'open' check (status in ('open', 'claimed', 'completed', 'cancelled')),
  created_by uuid references public.users(id) not null,
  created_at timestamptz default now()
);

-- T&Cs agreements
create table public.tcs_agreements (
  id uuid default gen_random_uuid() primary key,
  diner_id uuid references public.users(id) on delete cascade not null,
  signed_at timestamptz default now(),
  version integer not null default 1
);

-- Assignments (diner → slot)
create table public.assignments (
  id uuid default gen_random_uuid() primary key,
  slot_id uuid references public.slots(id) on delete cascade not null,
  diner_id uuid references public.users(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  voucher_id uuid,
  created_at timestamptz default now()
);

-- Proformas (dynamic checklists per restaurant)
create table public.proformas (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  title text not null,
  questions jsonb not null default '[]',
  version integer not null default 1,
  created_at timestamptz default now()
);

-- Reports
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid references public.assignments(id) on delete cascade not null,
  diner_id uuid references public.users(id) not null,
  restaurant_id uuid references public.restaurants(id) not null,
  answers jsonb not null default '{}',
  submitted_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed')),
  created_at timestamptz default now()
);

-- Report photos
create table public.report_photos (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references public.reports(id) on delete cascade not null,
  storage_path text not null,
  uploaded_at timestamptz default now()
);

-- Vouchers
create table public.vouchers (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid references public.assignments(id) on delete cascade not null,
  diner_id uuid references public.users(id) not null,
  value numeric(10,2) not null,
  qr_code text unique not null,
  status text not null default 'issued' check (status in ('issued', 'redeemed', 'expired')),
  expires_at date not null,
  issued_at timestamptz default now()
);

-- Add foreign key for voucher on assignments
alter table public.assignments
  add constraint assignments_voucher_fk
  foreign key (voucher_id) references public.vouchers(id);

-- Ratings (calculated per report)
create table public.ratings (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  report_id uuid references public.reports(id) on delete cascade not null,
  score numeric(3,2) not null check (score >= 1 and score <= 5),
  calculated_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.users enable row level security;
alter table public.restaurants enable row level security;
alter table public.slots enable row level security;
alter table public.assignments enable row level security;
alter table public.tcs_agreements enable row level security;
alter table public.proformas enable row level security;
alter table public.reports enable row level security;
alter table public.report_photos enable row level security;
alter table public.vouchers enable row level security;
alter table public.ratings enable row level security;

-- Helper: get current user role
create or replace function public.current_user_role()
returns text as $$
  select role from public.users where id = auth.uid();
$$ language sql security definer stable;

-- Users: can read own record; admin can read all
create policy "Users can view own profile" on public.users
  for select using (id = auth.uid() or public.current_user_role() = 'admin');

create policy "Users can update own profile" on public.users
  for update using (id = auth.uid());

-- Slots: diners and admins can view open slots
create policy "Anyone authenticated can view open slots" on public.slots
  for select using (auth.uid() is not null);

create policy "Admin can manage slots" on public.slots
  for all using (public.current_user_role() = 'admin');

-- Assignments: diners see own; admin sees all
create policy "Diners see own assignments" on public.assignments
  for select using (diner_id = auth.uid() or public.current_user_role() = 'admin');

create policy "Diners can create assignments" on public.assignments
  for insert with check (diner_id = auth.uid() and public.current_user_role() = 'diner');

create policy "Admin can manage assignments" on public.assignments
  for all using (public.current_user_role() = 'admin');

-- Reports: diners see own; restaurants see their own restaurant's reports; admin sees all
create policy "Diner sees own reports" on public.reports
  for select using (diner_id = auth.uid());

create policy "Diner can create/update own draft reports" on public.reports
  for all using (diner_id = auth.uid());

create policy "Admin sees all reports" on public.reports
  for select using (public.current_user_role() = 'admin');

-- Vouchers: diners see own vouchers
create policy "Diners see own vouchers" on public.vouchers
  for select using (diner_id = auth.uid() or public.current_user_role() = 'admin');

-- Proformas: restaurant managers and admin can manage
create policy "Anyone can view proformas" on public.proformas
  for select using (auth.uid() is not null);

create policy "Admin can manage proformas" on public.proformas
  for all using (public.current_user_role() = 'admin');

-- Restaurants: public read; admin manages
create policy "Anyone can view restaurants" on public.restaurants
  for select using (auth.uid() is not null);

create policy "Admin can manage restaurants" on public.restaurants
  for all using (public.current_user_role() = 'admin');
