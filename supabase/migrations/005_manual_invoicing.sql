-- ─── Manual invoicing for restaurant subscriptions ──────────────────────────
-- Five Star does not take card payments; Wendy invoices restaurants manually
-- (bank transfer / Xero). These columns let her track the billing cycle
-- from the admin CRM detail page.
--
-- The existing restaurants.subscription_status / subscription_plan /
-- subscription_renews_at columns remain the source of truth for feature
-- gating — Wendy sets them active when payment lands.

alter table public.restaurants
  add column if not exists invoice_amount_pence integer;

alter table public.restaurants
  add column if not exists invoice_interval text
    check (invoice_interval in ('monthly', 'quarterly', 'annual'));

alter table public.restaurants
  add column if not exists last_invoice_sent_at timestamptz;

alter table public.restaurants
  add column if not exists last_payment_received_at timestamptz;

alter table public.restaurants
  add column if not exists billing_notes text;
