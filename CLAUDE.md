# 5StarX — Project Context for Claude

## What this is
A cross-platform iOS + Android app for **5StarX**, a mystery dining company run by **Wendy**.
Previously all operations were manual via email (Wendy sent slot lists, assigned diners, distributed checklists, issued vouchers by hand). This app replaces the entire workflow.

**Business model:** Two-sided subscription — restaurants pay 5StarX monthly (£49–£99/mo) to receive mystery dine reports; 5StarX pays us a platform licence fee. Mystery diners use the app free and earn vouchers.

**Owners:**
- Charlotte Sim (`charcoderr`) — product owner, frontend
- Scott Wright (`fuseva`) — backend infrastructure (Supabase, Edge Functions, migrations)

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React Native + Expo SDK 54 (blank TypeScript) |
| Navigation | Expo Router (file-based, route groups) |
| Backend / DB | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Server state | TanStack Query (React Query v5) |
| Global state | Zustand (`stores/authStore.ts`) |
| Forms | React Hook Form + Zod (installed, use for new forms) |
| Payments | Manual invoicing (bank transfer via Xero — no Stripe) |
| Notifications | `expo-notifications` + Supabase Edge Functions |
| Photos | `expo-image-picker` → Supabase Storage bucket `report-photos` |
| QR codes | `react-native-qrcode-svg` |
| Haptics | `expo-haptics` |
| Deployment | EAS Build + EAS Submit |

---

## User roles

| Role | Access | Route group |
|---|---|---|
| `admin` | Full control — Wendy | `app/(admin)/` |
| `diner` | Mystery diner | `app/(diner)/` |
| `restaurant` | Restaurant manager | `app/(restaurant)/` |

Auth guard lives in `app/_layout.tsx` → `routeByRole()`. Diners go through pending approval + T&Cs before accessing the app.

---

## Key files

### Types
- `types/index.ts` — all domain interfaces: `AppUser`, `Restaurant`, `Slot`, `Assignment`, `Proforma`, `Report`, `Voucher`

### Theme / constants
- `utils/theme.ts` — brand colours (`colours`) and `SCORE_LABELS`
- `utils/statusColors.ts` — centralised status→label/colour maps for all entities
- `utils/dineTimers.ts` — in-dine stopwatch timer definitions and scoring logic
<!-- Billing: Wendy invoices restaurants manually; the subscription_status column is the source of truth and gets flipped from the admin CRM detail page. -->
- `utils/defaultProforma.ts` — 42-question default checklist based on real Buck's Bar proforma

### Hooks (data layer)
- `hooks/useSlots.ts` — slot browsing, claiming, admin management
- `hooks/useProforma.ts` — proforma fetch/save, report draft/submit, photo upload
- `hooks/useVouchers.ts` — issue, redeem, list vouchers
- `hooks/useAdmin.ts` — dashboard stats, reports review, diner management, restaurant CRUD
- `hooks/useCrm.ts` — restaurant/diner notes (Scott's CRM layer)
- `hooks/useRestaurantPortal.ts` — restaurant-scoped queries (Scott)
- `hooks/useSubscription.ts` — subscription status, manual invoice/payment tracking, admin override
- `hooks/useDineTimers.ts` — stopwatch state management with auto-cancel + haptics
- `hooks/useNotifications.ts` — push token registration, in-app notification queries

### Reusable components
- `components/StatusPill.tsx` — coloured status badge
- `components/Avatar.tsx` — initials avatar circle
- `components/EmptyState.tsx` — empty list placeholder with optional CTA
- `components/SearchFilterBar.tsx` — search input + filter chips
- `components/NotesPanel.tsx` — add/delete notes (used in CRM detail pages)
- `components/DineTimerPanel.tsx` — in-dine stopwatch UI panel
- `components/SubscriptionGate.tsx` — paywall wrapper (active/trial/inactive states)
- `components/Skeleton.tsx` — animated loading skeletons (`Skeleton`, `CardSkeleton`, `SkeletonList`)

### Supabase migrations
- `supabase/migrations/001_initial_schema.sql` — all core tables + RLS
- `supabase/migrations/002_crm.sql` — restaurant_notes, diner_notes, audit_log (Scott)
- `supabase/migrations/003_notifications.sql` — notifications table, push_token on users, subscription columns

---

## Scoring system
**Poor = 0 / Fair = 1 / Good = 2 / Excellent = 3** (not 1–5 stars internally).
Star ratings shown to restaurants are calculated as `(total / max) * 5` and stored in `restaurants.avg_rating`.
`SCORE_LABELS = ['Poor', 'Fair', 'Good', 'Excellent']` — index matches the score value.

---

## Brand colours
```
Gold:         #C9A84C   (primary accent, CTAs, active tabs)
GoldDark:     #A8863A
Charcoal:     #666B6F
CharcoalDark: #2C2C2E   (headers, tab bars)
OffWhite:     #F8F8F6   (screen backgrounds)
Error:        #D94F4F
ScorePoor:    #D94F4F
ScoreFair:    #F5A623
ScoreGood:    #4CAF50
ScoreExcellent: #C9A84C
```

---

## Screen inventory

### Auth (`app/(auth)/`)
- `login.tsx` — email/password login
- `register.tsx` — 3-step diner application form (matches real 5StarX PDF)
- `pending-approval.tsx` — waiting screen after application submitted
- `terms.tsx` — T&Cs (must scroll to bottom, stores agreement to `tcs_agreements`)

### Admin (`app/(admin)/`)
- `dashboard.tsx` — stats, pending applications banner, quick actions
- `slots.tsx` — create and manage mystery dine slots
- `reports.tsx` — list all submitted reports
- `report/[reportId].tsx` — full report review with score chart, photos, mark reviewed
- `restaurants.tsx` — CRM list with search/filter
- `restaurant/[restaurantId].tsx` — CRM detail (notes, slots, reports, diners, subscription override)
- `diners.tsx` — diner list, approve/reject applications
- `vouchers.tsx` — all vouchers with status
- `tcs-editor.tsx` — edit Terms & Conditions (version bumps force re-sign)

### Diner (`app/(diner)/`)
- `home.tsx` — available slots feed, claim a slot
- `my-assignments.tsx` — my confirmed/pending assignments
- `report/[assignmentId].tsx` — checklist + in-dine timers + photo upload
- `vouchers.tsx` — QR voucher display
- `notifications.tsx` — in-app notification centre with unread badge
- `profile.tsx` — name, email, sign out

### Restaurant (`app/(restaurant)/`)
- `dashboard.tsx` — rating card, stats, activity feed, subscription banner
- `reports.tsx` — reviewed reports with search/sort
- `report/[reportId].tsx` — report detail (diner identity hidden)
- `proforma.tsx` — edit their checklist (add/remove questions)
- `account.tsx` — read-only subscription status + billing contact (Wendy invoices manually)

---

## Backend status (Scott)
All Edge Functions and migrations are in-repo. See `BACKEND_SETUP.md` for the
deployment runbook. Summary of what's built:

1. **Migration 004** — AI summary columns on `reports` + reminder dedup columns on `assignments`
2. **Migration 005** — manual invoicing columns on `restaurants` (amount, interval, last invoice/payment, notes)
3. **Edge Function `notify`** — unified dispatcher for in-app notifications + Expo push. DB-webhook or direct invoke.
4. **Edge Function `scheduled-reminders`** — hourly pg_cron job for 24h + morning-of reminders
5. **Edge Function `summarise-report`** — Claude Haiku 4.5 call on report submit, writes summary/flags/recommendations
6. **Billing (no Stripe)** — Wendy invoices manually; admin CRM detail page has Billing section to record invoice sent / payment received, which flips `subscription_status` and bumps `subscription_renews_at`

Still to do on Supabase itself: apply migrations, deploy functions, wire the 5 DB webhooks, schedule pg_cron, set `ANTHROPIC_API_KEY` secret. All covered in `BACKEND_SETUP.md`.

---

## Development commands
```bash
# Start dev server
npx expo start

# Type check
npx tsc --noEmit

# EAS build (preview — internal distribution)
eas build --platform all --profile preview

# EAS build (production — App Store / Play Store)
eas build --platform all --profile production

# OTA update (JS only, no store review needed)
eas update --branch production --message "description"
```

## Branch strategy
- `main` — production releases only
- `develop` — integration branch, Charlotte and Scott both push here
- feature branches → PR to `develop`

## Important constraints
- Always use `--legacy-peer-deps` with npm install (React 19 peer dep conflict)
- `expo-image-picker` uses `ImagePicker.MediaTypeOptions` (not `MediaType`)
- Timer auto-cancel uses `setTimeout` keyed by timer ID — always clear on reset/unmount
