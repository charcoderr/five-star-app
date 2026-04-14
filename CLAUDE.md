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

## Getting started — running the app locally

This section is written for a fresh clone on a new machine. Everything
here was learned the hard way over the last two sessions; if something
surprises you, read the **Gotchas** subsection first before spelunking.

### Prerequisites
- macOS (Xcode + iOS Simulator is the easiest path; Android works too)
- Node 20+ (`node --version`)
- Xcode from the App Store (for iOS Simulator) — launch it once so it
  finishes post-install, then open a simulator from **Xcode → Open
  Developer Tool → Simulator**
- Supabase account with access to the `5starreviews` project (ref
  `usjbatnjhgfkuxgiykzz`) — Scott owns the org

### One-time setup

1. Clone and install deps:
   ```bash
   git clone https://github.com/charcoderr/five-star-app.git
   cd five-star-app
   git checkout develop       # active branch; main is release-only
   npm install --legacy-peer-deps
   ```

2. Install the Supabase CLI. Homebrew is the normal path but if your
   Xcode Command Line Tools are older than the Xcode version, brew
   will refuse. Fallback: direct binary (works on Apple Silicon and
   Intel — pick the right tarball):
   ```bash
   # Preferred
   brew install supabase/tap/supabase

   # Fallback (Apple Silicon shown)
   curl -sL https://github.com/supabase/cli/releases/latest/download/supabase_darwin_arm64.tar.gz \
     -o /tmp/supabase.tar.gz
   tar -xzf /tmp/supabase.tar.gz -C /tmp/
   mkdir -p ~/.local/bin && mv /tmp/supabase ~/.local/bin/supabase
   # then add ~/.local/bin to PATH, or call as ~/.local/bin/supabase
   ```

3. Authenticate and link to the Supabase project:
   ```bash
   supabase login                                    # browser flow
   supabase link --project-ref usjbatnjhgfkuxgiykzz
   ```

4. Create `.env.local` (gitignored) in the project root:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://usjbatnjhgfkuxgiykzz.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key — ask Scott or grab from dashboard → Project Settings → API>
   APP_ENV=development
   ```

### Running the app
```bash
# Scott's Delta mobile project runs on 8081, so always specify a port
npx expo start --ios --port 8082
# --clear adds 30s of re-bundling but avoids 90 % of "it worked on my
# machine" cache bugs. Use it when things act weird.
npx expo start --ios --port 8082 --clear
```

The iOS Simulator should launch automatically. If it doesn't:
```bash
xcrun simctl list devices available | grep Booted
open -a Simulator
# then press `i` in the expo terminal to target iOS
```

Hit `⌘R` in the simulator to force-reload after big changes.

### Test credentials

Two accounts are seeded in the dev DB:

| Role  | Email                        | Password    |
|-------|------------------------------|-------------|
| Admin | `charlotte.sim1@icloud.com`  | _as set at registration — ask Scott if unsure_ |
| Diner | `diner@5starx.co.uk`         | `Test1234!` |

The diner is pre-approved, T&Cs pre-signed, and has a confirmed
assignment at **La Vita Buchanan Street** (the seeded restaurant) so
you land straight on the proforma if you tap My Dines.

### Seeding test data
```bash
# Restaurant + 55-question proforma
supabase db query --linked --file supabase/seeds/la_vita.sql

# One open slot at La Vita for tomorrow 19:00
supabase db query --linked --file supabase/seeds/la_vita_slot.sql
```

Re-run either whenever you wipe data; both are idempotent.

### Gotchas we've actually hit

- **Don't run on port 8081** — Scott's Delta mobile project uses it.
  Always pass `--port 8082` (or any free port).
- **Entry point is `expo-router/entry`** — not `./App.tsx` or
  `./index.ts`. Those files were removed; don't bring them back or
  you'll see the Expo scaffold ("Open up App.tsx to start working...")
  instead of the app.
- **`app/index.tsx` must exist** as the root route. It renders a
  branded splash while `app/_layout.tsx`'s `AuthGuard` figures out
  where to redirect. The AuthGuard treats `segments.length === 0` as
  root and calls `routeByRole()` there — don't remove that branch.
- **AsyncStorage version has to match the Expo SDK** — we were pinned
  to 3.0.2 briefly which doesn't exist in Expo Go's native modules
  and crashed with "Native module is null". `npx expo install
  @react-native-async-storage/async-storage --fix` restores the
  compatible version.
- **Migrations use `gen_random_uuid()`, not `uuid_generate_v4()`**.
  Hosted Supabase installs uuid-ossp into the `extensions` schema
  which isn't on the default search_path, so `uuid_generate_v4()`
  throws at table creation time. pgcrypto's `gen_random_uuid()` is
  built in and safe from any schema.
- **Every `alter table ... enable row level security;` needs an
  actual policy**. If you enable RLS and forget to define policies,
  all reads and writes silently fail from the anon/authed client.
  Migration 007 backfills the three tables where 001 missed them.
- **`npx expo install --fix`** is your friend when anything native
  misbehaves — it picks the version Expo SDK 54 ships with.
- **Supabase free tier caps at 2 active projects per org**. Scott's
  upgraded to Pro, but the first signup we did got blocked with
  `exceed_db_size_quota`.

### Common dev loop
```bash
# 1. Check db state
supabase db query --linked --output table "select email, role, status from public.users"

# 2. Apply a new migration
# (write it into supabase/migrations/NNN_description.sql)
supabase db push

# 3. Tail Metro logs if the app is doing something weird
# (visible in the terminal where you ran expo start)

# 4. After UI changes — iOS Simulator auto hot-reloads via Metro.
#    Full reload: ⌘R in the simulator.
```

### What to review / where Claude can add value
When Charlotte's Claude is reviewing the app for UX/UI improvements,
the screens most likely to benefit from attention:

- `app/(admin)/dashboard.tsx` — currently clean but could benefit from
  richer widgets (recent activity feed, score trends).
- `app/(diner)/home.tsx` — the available-slots feed. Worth thinking
  about empty-state content, filtering, and how waitlist entries are
  surfaced (Charlotte added a WAITLIST section in Round 2).
- `app/(diner)/report/[assignmentId].tsx` — the big 55-question form.
  Navigation between categories, sticky submit bar, save-draft UX,
  photo prompt placement.
- `app/(admin)/restaurant/[restaurantId].tsx` — CRM detail page with
  Billing section. Density of info, placement of notes vs slots.
- `components/StatusPill.tsx`, `SearchFilterBar.tsx`, `EmptyState.tsx`
  — shared primitives; small tweaks here cascade.
- Typography / spacing across the app — now that everything uses
  Ionicons and a centralised `colours` palette, a systematic pass
  would pay off.

Commits land on `develop`; `main` is release-only. Push to `develop`,
Scott will merge to main when a batch is ready to ship.

---

## Development commands
```bash
# Start dev server (always include --port 8082; see Gotchas)
npx expo start --ios --port 8082

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
