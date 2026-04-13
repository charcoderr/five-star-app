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
eas secret:create --scope project --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value "pk_live_..."
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

## Stripe — go-live checklist (Scott)

- [ ] Deploy `create-payment-intent` Edge Function with live Stripe secret key
- [ ] Register Stripe webhook endpoint pointing to the Edge Function
- [ ] Set webhook to listen for: `payment_intent.succeeded`, `customer.subscription.deleted`
- [ ] Switch `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` EAS secret to `pk_live_...`
- [ ] Test end-to-end with a real card before launch

## Supabase — production checklist (Scott)

- [ ] Create separate production Supabase project (don't use dev DB for prod)
- [ ] Run all migrations (001, 002, 003) on production DB
- [ ] Enable email confirmations in Auth settings
- [ ] Set up pg_cron for scheduled notification Edge Functions
- [ ] Configure storage bucket `report-photos` with correct RLS
- [ ] Set SMTP provider for transactional emails
