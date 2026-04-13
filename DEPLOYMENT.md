# 5StarX — Deployment Checklist

## Before your first EAS build

### 1. Create an Expo account
Go to https://expo.dev and create an account, then run:
```
eas login
eas init   # links this project and gives you a project ID
```
Copy the project ID into `app.json` → `extra.eas.projectId` and `updates.url`.

### 2. Add your EXPO_TOKEN to GitHub
- In Expo dashboard → Account Settings → Access Tokens → create one
- In GitHub repo → Settings → Secrets → Actions → add `EXPO_TOKEN`

### 3. Set up environment variables in EAS
```
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxx.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
```

---

## iOS (App Store)

### Prerequisites
- Apple Developer account (£99/yr) — register at developer.apple.com
- Create an App ID: `com.5starx.app`
- Create the app in App Store Connect

### Fill in eas.json
```json
"ios": {
  "appleId": "your@apple.id",
  "ascAppId": "123456789",      ← from App Store Connect URL
  "appleTeamId": "ABCD1234EF"   ← from developer.apple.com Membership
}
```

### Build + submit
```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

### App Store Connect — fill in before submitting for review
- App name: **5StarX**
- Subtitle: Mystery Dining Platform
- Category: Food & Drink
- Privacy Policy URL: (add your policy page URL)
- Description:
  > 5StarX is the mystery dining platform for professional mystery diners. 
  > Browse available restaurant assignments, submit detailed reports, track your 
  > scores, and receive digital vouchers — all in one place.
- Keywords: mystery dining, restaurant review, secret shopper, food review
- Screenshots: required for 6.7", 5.5" iPhone and iPad (if tablet enabled)
- Age rating: 4+

---

## Android (Google Play)

### Prerequisites
- Google Play Developer account ($25 one-time) — play.google.com/console
- Create app: package `com.fivestarx.app`
- Download service account JSON for automated submission

### Fill in eas.json
```json
"android": {
  "serviceAccountKeyPath": "./google-service-account.json"
}
```
⚠️ Add `google-service-account.json` to `.gitignore` — it's a secret.

### Build + submit
```bash
eas build --platform android --profile production
eas submit --platform android --profile production
```

### Play Console — fill in before submitting
- Short description (80 chars): Professional mystery dining app for 5StarX diners
- Full description: same as App Store description above
- Category: Food & Drink
- Content rating: Everyone
- Privacy policy URL: required

---

## OTA Updates (after first submission)

Once the app is live, you can push JS-only updates instantly without going through review:
```bash
eas update --branch production --message "Fix: voucher expiry display"
```
This updates all production users on next app launch.

---

## Billing — manual invoicing

Five Star does not take card payments. Wendy invoices each restaurant client
manually (bank transfer, Xero). Inside the app this means:

- The restaurant's `subscription_status` / `subscription_plan` /
  `subscription_renews_at` columns are the source of truth for feature gating
- Wendy sets these from the admin CRM detail page (Billing section):
  - Edit billing — enter monthly amount, interval, plan label, notes
  - Invoice sent — stamps `last_invoice_sent_at` to today
  - Payment received — flips status to `active`, stamps
    `last_payment_received_at`, bumps `subscription_renews_at` forward by
    the chosen interval
- Restaurants see a read-only "Account" screen showing plan, next renewal
  date, and a `billing@5starx.co.uk` contact link

No Stripe, no webhook, no Edge Function needed for payments.

## Supabase — production checklist (Scott)

- [ ] Create separate production Supabase project (don't use dev DB for prod)
- [ ] Run all migrations (001 → 005) on production DB via `supabase db push`
- [ ] Enable email confirmations in Auth settings
- [ ] Configure storage bucket `report-photos` with RLS policies (see BACKEND_SETUP.md)
- [ ] Deploy Edge Functions (`notify`, `scheduled-reminders`, `summarise-report`)
- [ ] Wire Supabase DB Webhooks for the notify function (see BACKEND_SETUP.md)
- [ ] Schedule `scheduled-reminders` via pg_cron hourly
- [ ] Set SMTP provider for transactional emails
