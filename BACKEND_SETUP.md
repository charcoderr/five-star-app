# Backend Setup — Five Star App

Step-by-step deployment for the Supabase side of the app (Scott's domain).
All work lives in `supabase/` and corresponds to issue [#1](https://github.com/charcoderr/five-star-app/issues/1).

---

## 0. Prerequisites

```bash
# Supabase CLI
brew install supabase/tap/supabase
supabase --version   # need >= 1.200

# Stripe CLI (for local webhook testing)
brew install stripe/stripe-cli/stripe

# Expo / EAS
npm install -g eas-cli
eas --version
```

Link the local repo to the Supabase project once:
```bash
cd /path/to/five-star-app
supabase link --project-ref <PROJECT_REF>   # from dashboard URL
```

---

## 1. Apply database migrations

Order matters — 001 is already applied to the live project, 002/003 may or may not be. Run them in order:

```bash
supabase db push                     # applies all pending migrations
# or individually:
supabase migration up 002_crm
supabase migration up 003_notifications
supabase migration up 004_ai_summaries
supabase migration up 005_stripe
```

Verify in the Supabase SQL editor:
```sql
select column_name from information_schema.columns where table_name='reports' and column_name like 'ai_%';
-- should return: ai_summary, ai_flags, ai_recommendations
select column_name from information_schema.columns where table_name='restaurants' and column_name like 'stripe%';
-- should return: stripe_customer_id, stripe_subscription_id
```

---

## 2. Create the Storage bucket for report photos

The app uses a bucket called `report-photos` (referenced in `hooks/useProforma.ts`).

Supabase dashboard → **Storage** → New bucket:
- Name: `report-photos`
- Public: **No** (signed URLs generated per request)
- File size limit: 10 MB
- Allowed MIME types: `image/jpeg, image/png`

RLS policies on `storage.objects` for this bucket:
```sql
-- Diners can upload photos only to their own report folders
create policy "Diners upload own report photos" on storage.objects
  for insert with check (
    bucket_id = 'report-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.reports where diner_id = auth.uid()
    )
  );

-- Admins can read all photos (signed URLs)
create policy "Admins read report photos" on storage.objects
  for select using (
    bucket_id = 'report-photos'
    and exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Diners can read their own photos
create policy "Diners read own report photos" on storage.objects
  for select using (
    bucket_id = 'report-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.reports where diner_id = auth.uid()
    )
  );
```

---

## 3. Set Edge Function secrets

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_xxx \
  STRIPE_WEBHOOK_SECRET=whsec_xxx \
  STRIPE_PRICE_STANDARD=price_xxx \
  STRIPE_PRICE_PREMIUM=price_xxx \
  ANTHROPIC_API_KEY=sk-ant-xxx

# Verify
supabase secrets list
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

---

## 4. Deploy Edge Functions

```bash
# Functions that call back into Supabase auth-gated endpoints keep default JWT verification
supabase functions deploy create-payment-intent
supabase functions deploy notify
supabase functions deploy scheduled-reminders
supabase functions deploy summarise-report

# Stripe webhook MUST skip JWT verification so Stripe can POST to it directly
supabase functions deploy stripe-webhook --no-verify-jwt
```

Get the public URL of each for the next steps:
```
https://<PROJECT_REF>.supabase.co/functions/v1/<function-name>
```

---

## 5. Stripe dashboard

### 5a. Create the products + prices
Stripe dashboard → **Products** → New:

| Product | Price | Recurring | Save the price ID |
|---|---|---|---|
| 5StarX Standard | £49 GBP | Monthly | `STRIPE_PRICE_STANDARD` |
| 5StarX Premium | £99 GBP | Monthly | `STRIPE_PRICE_PREMIUM` |

Copy each `price_xxx` ID back into the secrets (step 3).

### 5b. Webhook endpoint
Stripe dashboard → **Developers → Webhooks → Add endpoint**:
- URL: `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`
- Events:
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Reveal signing secret → copy to `STRIPE_WEBHOOK_SECRET` (step 3).

### 5c. Local test (optional)
```bash
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
# trigger a fake event:
stripe trigger invoice.paid
```

---

## 6. Configure Database Webhooks (for notifications + AI)

Supabase dashboard → **Database → Webhooks** → Create webhook.

### 6a. `notify-on-assignment`
| Field | Value |
|---|---|
| Table | `assignments` |
| Events | Insert |
| Type | HTTP Request |
| Method | POST |
| URL | `https://<REF>.supabase.co/functions/v1/notify` |
| HTTP Headers | `Authorization: Bearer <ANON_KEY>` |
| HTTP Params | _(none)_ |

### 6b. `notify-on-voucher`
Same as above but Table = `vouchers`.

### 6c. `notify-on-report-reviewed`
Table = `reports`, Events = **Update**.

### 6d. `notify-on-new-application`
Table = `users`, Events = **Insert**.

### 6e. `notify-on-new-slot`
Table = `slots`, Events = **Insert**.

### 6f. `summarise-on-report-submit`
Table = `reports`, Events = **Update**, URL = `.../functions/v1/summarise-report`.

The Edge Functions themselves filter by status transitions, so it's safe to fire on every row change.

---

## 7. Schedule reminders with `pg_cron`

Supabase dashboard → **Database → Extensions** → enable **pg_cron** and **pg_net**.

Then in the SQL editor:
```sql
-- One-time: store the service role key so the cron job can call the function
-- (use a secret custom setting rather than hardcoding).
alter database postgres set "app.service_role_key" = '<SERVICE_ROLE_KEY>';
alter database postgres set "app.functions_base_url" = 'https://<PROJECT_REF>.supabase.co/functions/v1';

-- Schedule hourly
select cron.schedule(
  'scheduled-reminders-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := current_setting('app.functions_base_url') || '/scheduled-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verify
select jobname, schedule from cron.job;
```

To remove: `select cron.unschedule('scheduled-reminders-hourly');`

---

## 8. Client env vars

Local `.env` (gitignored):
```
EXPO_PUBLIC_SUPABASE_URL=https://<REF>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

EAS secrets (for production builds):
```bash
eas login
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value https://<REF>.supabase.co
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <ANON_KEY>
eas secret:create --scope project --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value pk_live_xxx
eas secret:list
```

---

## 9. Smoke test

After deploys, run these end-to-end checks:

| Flow | Expected result |
|---|---|
| Sign up as diner (app) | Admin receives push + in-app "New application" |
| Admin approves diner | Diner can proceed past pending-approval |
| Admin creates slot | Active diners receive push "new slot available" |
| Diner claims slot | Diner receives push "booking confirmed" |
| Diner submits report | Admin `reports` table row gets `ai_summary` populated within ~10s |
| Admin marks report reviewed | Diner receives push "Wendy has reviewed your report" |
| Voucher issued | Diner receives push "£X voucher ready" |
| Hourly cron tick (manually invoke `scheduled-reminders`) | Assignments 24h away get reminder |
| Restaurant subscribes via Stripe sheet | Webhook fires, `restaurants.subscription_status` → `active` |

Manual test invocations:
```bash
# Summarise a specific report (backfill / debug)
curl -X POST \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"reportId":"<UUID>"}' \
  https://<REF>.supabase.co/functions/v1/summarise-report

# Fire the hourly reminder job now
curl -X POST \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  https://<REF>.supabase.co/functions/v1/scheduled-reminders

# Send a direct notification (bypasses DB webhook)
curl -X POST \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userIds":["<UUID>"],"type":"test","title":"Hello","body":"World"}' \
  https://<REF>.supabase.co/functions/v1/notify
```

---

## 10. Logs & observability

- **Function logs**: Supabase dashboard → Edge Functions → pick a function → **Logs** tab
- **DB webhook attempts**: Dashboard → Database → Webhooks → pick webhook → **Logs**
- **Stripe events**: Stripe dashboard → Developers → Webhooks → endpoint → attempts
- **pg_cron history**: `select * from cron.job_run_details order by start_time desc limit 20;`
