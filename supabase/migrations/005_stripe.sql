-- ─── Stripe customer linkage ─────────────────────────────────────────────────
-- Populated the first time a restaurant starts a subscription flow.
alter table public.restaurants
  add column if not exists stripe_customer_id text;

alter table public.restaurants
  add column if not exists stripe_subscription_id text;

create unique index if not exists restaurants_stripe_customer_idx
  on public.restaurants (stripe_customer_id)
  where stripe_customer_id is not null;
