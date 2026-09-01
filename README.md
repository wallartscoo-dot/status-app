# Status App — Phase 1 + 2 + 3 + 4 + 5 + 6

**"Find the perfect status in seconds."**

- **Phase 1:** the Expo/React Native/TypeScript client — navigation,
  theming, splash, onboarding, auth screens, and the Home/Explore/Create/
  Downloads/Profile tabs.
- **Phase 2:** the Express + PostgreSQL backend — auth, statuses,
  categories, search, favorites — with the app wired to it end-to-end.
- **Phase 3:** real video/image upload with on-device storage, a working
  download pipeline (saves to the device's Photos/gallery app), native
  sharing, and creator profiles with follow/following.
- **Phase 4:** notifications, personalized "For You" recommendations,
  notification preferences in Settings, and a full admin API + standalone
  web dashboard for moderation and analytics.
- **Phase 5:** an automated backend test suite (29 passing tests), a real
  security fix (admin authorization no longer trusts stale token claims),
  image caching, crash-safe error boundaries, analytics event tracking
  end-to-end, and Docker-based production deployment.
- **Phase 6 (this update):** production build configuration for both
  stores and a full submission guide — see
  **[`BUILD.md`](BUILD.md)**.

## What's included in Phase 6

See **[`BUILD.md`](BUILD.md)** for the full guide. Short version:

- `eas.json` has three build profiles: `development` (custom dev client),
  `preview` (Android APK for direct-install testing, no store needed), and
  `production` (Android AAB for Google Play + iOS build for the App Store,
  both with build-number auto-increment).
- `app.json` is store-ready: bundle identifiers, version/build numbers,
  `ITSAppUsesNonExemptEncryption: false`, and all the permission usage
  descriptions the Phase 3 upload/download features need.
- No native `android/`/`ios/` folders are committed — the project stays in
  Expo's managed workflow so EAS Build always generates native config fresh
  from `app.json`, with no risk of it drifting out of sync (a real, stale
  `android/` folder from an earlier scaffolding pass was found and removed
  this phase for exactly this reason).
- `BUILD.md`'s pre-submission checklist covers what's still a placeholder
  and needs a real value before actually submitting: branded app icons
  (current ones are simple placeholders from Phase 1), a publicly hosted
  privacy policy URL, the production API URL, and Apple/Google account
  details in `eas.json`'s `submit` config.
- This phase's builds/submission steps require a real Expo/Apple/Google
  account and network access this environment doesn't have, so `BUILD.md`
  documents exact commands rather than including built binaries — same
  spirit as spec section 34's requirement to "provide exact commands for
  creating builds."

## What's included in Phase 5

- **Testing**: `backend/tests/` — Vitest + Supertest against a real
  Postgres test database. 29 tests covering signup/login validation,
  banned-user login blocking, status listing/trending/search/category
  filtering, favorites (add/idempotent/remove), and the full admin surface
  (403 for non-admins, ban-blocks-login, moderation hide/restore, report
  review). Run with `cd backend && npm test`.
- **Security fix**: `requireAdmin` used to trust the `role` claim baked into
  the JWT at login time — so promoting, demoting, or banning a user wouldn't
  take effect until their token expired and refreshed. It now re-checks
  role and ban status from the database on every admin request.
- **Performance**: remote thumbnails and avatars across the app now load
  through `expo-image` instead of React Native's plain `Image`, which adds
  disk caching — repeat views of the same status/creator no longer
  re-fetch the image over the network.
- **Error handling**: the backend now has process-level
  `uncaughtException`/`unhandledRejection` handlers with a force-exit
  timeout on shutdown; the mobile app has a root-level `ErrorBoundary`
  (`src/components/ErrorBoundary.tsx`) that shows a recoverable "Try Again"
  screen instead of a white screen on a render crash.
- **Analytics**: a full event-tracking pipeline — `POST
  /api/analytics/events` (backend), a `track()` fire-and-forget utility
  (mobile), wired into signup, login, favorite/unfavorite, download
  completion, share, follow, search, publish, and Home screen views. A
  7-day rolling summary shows up on the admin dashboard's Overview tab.
- **Production configuration**: `backend/Dockerfile` (multi-stage,
  non-root user, healthcheck) and `backend/docker-compose.yml` (API +
  Postgres, named volumes for data/uploads) — see
  **[`backend/README.md`](backend/README.md#production-deployment)** for
  the full deployment checklist, including a fix I found and verified
  while writing it: `npm run build` alone didn't copy `schema.sql` into
  `dist/`, which would have silently broken migrations against a
  production build. Now fixed via a `postbuild` script.

## What's included in Phase 4

- **Notifications** (`app/notifications.tsx`): welcome message on signup,
  "someone favorited your status," "new status from a creator you follow,"
  and "your status is getting popular 🔥" at download milestones — all
  created server-side and shown with mark-read / mark-all-read. The bell
  icon on Home now links here and shows a live unread-count badge.
- **Settings** (`app/settings.tsx`): light/dark/system theme picker,
  per-type notification toggles (Favorites / New from creators / Trending /
  App updates) that sync to the backend, and Privacy Policy / Terms links
  (`app/privacy.tsx`, `app/terms.tsx`).
- **For You** section on Home: a personalized rail from
  `GET /api/statuses/for-you`, which weights the categories you've
  favorited/downloaded most and falls back to trending until there's enough
  signal.
- **My Favorites** (`app/favorites.tsx`): the last dangling Profile link
  from Phase 1 — now backed by `GET /api/favorites`.
- **Admin web dashboard** (`admin/` — standalone static HTML/CSS/JS, no
  build step): sign in with an admin account and get Overview (analytics),
  Users (search + ban/unban), Content (approve/reject/remove/feature/
  delete), Reports (review/dismiss), and Categories (add/edit) — see
  **[`backend/README.md`](backend/README.md#admin-web-dashboard)** for how
  to run it.
- Backend additions: `GET/PATCH /api/notifications*`, `GET
  /api/statuses/for-you`, the full `/api/admin/*` surface, and a
  `notificationPrefs` field on the user profile — see
  **[`backend/README.md`](backend/README.md)** for the full API reference.

## What's included in Phase 3

- **Upload flow** (`app/(tabs)/create.tsx`): pick a video (≤30s, spec
  section 6) or image from the library or camera → fill in title/
  description/category/hashtags → **Preview** → **Publish**, uploading a
  real file to `POST /api/statuses/upload`
- **Download pipeline** (`src/hooks/useDownloadStatus.ts`): tap Download on
  any `StatusCard` → streams the file with `expo-file-system` (with live
  progress) → saves it to the device's gallery via `expo-media-library` →
  records the download server-side. States shown: Downloading (with %),
  Processing, Completed ("Saved"), Failed (tap to Retry) — matching spec
  section 7 exactly
- **My Downloads** (`app/(tabs)/downloads.tsx`): real history from
  `GET /api/downloads`, pull-to-refresh, empty/error/guest states
- **Sharing** (`src/hooks/useShare.ts`): every `StatusCard` has a share icon
  that opens the device's native share sheet (WhatsApp, Messages, Copy Link,
  whatever's installed) via React Native's `Share` API
- **Creator profiles** (`app/creator/[username].tsx`): avatar, bio, follower/
  upload/download stats, a Follow/Following button, and a grid of their
  popular statuses. Tap any `@username` on a status card to get there.
- **Following feed** (`app/following.tsx`): statuses from creators you
  follow, reachable from Profile → Following
- Backend additions: `POST /api/statuses/upload` (real multipart file
  upload), `POST /api/statuses/:id/download` + `GET /api/downloads`,
  `GET /api/creators/:username`, `POST`/`DELETE /api/follows/:userId`,
  `GET /api/follows/feed` — see **[`backend/README.md`](backend/README.md)**
  for the full reference and what's deferred to Phase 4.

## What's included in Phase 2

- `backend/` — full Express + TypeScript + PostgreSQL API. See
  **[`backend/README.md`](backend/README.md)** for setup, the demo accounts,
  the full endpoint reference, and what's intentionally deferred to later
  phases.
- `src/services/api.ts` — typed REST client with automatic access-token
  refresh on 401s and parsed backend error messages
- `src/context/AuthContext.tsx` — now calls real `/api/auth/signup`,
  `/api/auth/login`, and `/api/users/me` instead of local mocks; still
  supports guest browsing (spec section 4) without an account
- `app/(tabs)/home.tsx`, `app/search.tsx`, `app/category/[key].tsx` — fetch
  live data from `/api/statuses/*` with loading, error/retry, and empty
  states instead of static arrays
- `src/hooks/useFavoriteToggle.ts` + `StatusCard`'s `onToggleFavorite` prop —
  favorites now sync to `POST`/`DELETE /api/statuses/:id/favorite`; guests
  are redirected to sign up instead of hitting the auth-only endpoint
- `src/constants/mockData.ts` is no longer imported by any screen for status
  content (kept only for its `StatusItem` type, which `src/utils/mapStatus.ts`
  now maps real API responses into)

## Running the full stack

You need three things running: PostgreSQL, the backend, and Expo.

```bash
# Terminal 1 — database (adjust for your Postgres setup)
psql -U postgres -c "CREATE DATABASE statusapp;"

# Terminal 2 — backend
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL + JWT secrets
npm run migrate
npm run seed
npm run dev             # http://localhost:4000

# Terminal 3 — mobile app
cd ..                    # repo root
npm install
npx expo start

# Terminal 4 (optional) — admin web dashboard
cd admin
python3 -m http.server 8080   # or: npx serve .
```

- On a **simulator** (iOS Simulator / Android Emulator on the same machine),
  the default `http://localhost:4000` in `app.json` → `expo.extra.apiUrl`
  works as-is.
- On a **physical device** via Expo Go, `localhost` won't resolve to your
  computer. Override it with your machine's LAN IP:
  ```bash
  EXPO_PUBLIC_API_URL=http://192.168.1.23:4000 npx expo start
  ```

### Try it end-to-end

1. Sign up with a new account (or log in with the seeded `demo_creator` /
   `ChangeMe123!`) → lands on Home
2. Home's Trending Now / Fresh Drops rails show the 8 seeded sample statuses
   pulled live from Postgres
3. Tap a heart on any status card → `POST /api/statuses/:id/favorite` fires;
   check `GET /api/favorites` (or the Profile stats after `refreshProfile()`)
   to confirm it stuck
4. Explore → tap a category → `GET /api/statuses/category/:key` loads that
   category's statuses
5. Search "love" → debounced call to `GET /api/statuses/search?q=love`
6. Kill and reopen the app → session persists (tokens in `expo-secure-store`)
   and `/api/users/me` re-hydrates the profile in the background
7. Open `http://localhost:8080` → sign in with `admin` / `ChangeMe123!` →
   Overview shows live analytics; ban a user in Users, moderate a status in
   Content, and confirm the change reflects back in the mobile app
8. Back in the mobile app, tap the bell icon on Home → Notifications shows
   the WELCOME notification from signup; Settings → toggle a notification
   preference and confirm it persists after a refresh

## What's included in Phase 1

- Expo Router file-based navigation (stack + tabs)
- Light / dark / system theme with a purple-blue premium color system
- Splash screen + 3-screen onboarding ("Your Status. Your Style." / "Download
  in Seconds" / "Share Your Mood") with **Create Account** / **Continue as
  Guest**
- Login (email or username + password, remember me, forgot password), Signup
  (full validation), Forgot Password
- Home screen: top bar, mood hero with horizontally-scrollable categories,
  Trending Now, Fresh Drops
- Explore screen: search entry point + full category grid (20 categories)
- Profile screen: avatar, stats, account actions, guest upsell state
- Create / Downloads tabs scaffolded with the correct empty/gated states
  (full upload + download pipelines ship in Phase 3)
- Reusable components: `Button`, `TextField`, `Screen`, `MoodChip`,
  `StatusCard`

## Project structure

```
status-app/
├── backend/                  # Express + PostgreSQL API (see backend/README.md)
│   ├── src/
│   │   ├── routes/, controllers/, services/, validators/, middleware/
│   │   ├── config/storage.ts # media storage adapter (local disk, S3-ready)
│   │   └── db/schema.sql, migrate.ts, seed.ts
│   ├── tests/                # Phase 5: Vitest + Supertest (29 tests)
│   ├── Dockerfile, docker-compose.yml  # Phase 5: production deployment
│   └── package.json
├── admin/                    # Phase 4: standalone admin web dashboard (no build step)
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── app/                      # Expo Router routes (file-based navigation)
│   ├── _layout.tsx           # Root layout: providers + Stack
│   ├── index.tsx             # Splash/redirect logic
│   ├── onboarding.tsx
│   ├── search.tsx            # wired to GET /api/statuses/search
│   ├── category/[key].tsx    # wired to GET /api/statuses/category/:key
│   ├── creator/[username].tsx
│   ├── following.tsx
│   ├── notifications.tsx     # Phase 4
│   ├── settings.tsx          # Phase 4: theme + notification prefs
│   ├── favorites.tsx         # Phase 4
│   ├── privacy.tsx, terms.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── forgot-password.tsx
│   └── (tabs)/
│       ├── _layout.tsx       # Bottom tab bar
│       ├── home.tsx          # For You + Trending + Fresh Drops, notification bell
│       ├── explore.tsx
│       ├── create.tsx        # upload flow: pick -> details -> preview -> publish
│       ├── downloads.tsx
│       └── profile.tsx
├── src/
│   ├── theme/                # colors, tokens, ThemeProvider (light/dark/system)
│   ├── context/AuthContext.tsx  # wired to /api/auth/*, /api/users/me, notificationPrefs
│   ├── hooks/
│   │   ├── useFavoriteToggle.ts
│   │   ├── useDownloadStatus.ts  # download state machine + save to gallery
│   │   └── useShare.ts
│   ├── components/            # Button, TextField, Screen, MoodChip, StatusCard, ErrorBoundary
│   ├── constants/              # categories, StatusItem type
│   ├── utils/
│   │   ├── mapStatus.ts           # API status -> StatusItem
│   │   └── analytics.ts            # Phase 5: fire-and-forget event tracking
│   └── services/api.ts          # typed REST client, token refresh, error handling
├── app.json                  # store-ready: bundle IDs, versions, permissions
├── eas.json                  # Phase 6: dev/preview/production build profiles
├── BUILD.md                  # Phase 6: build & store submission guide
├── legal/                    # Phase 6: standalone privacy policy / ToS (host these — required at submission)
│   ├── privacy-policy.html
│   └── terms-of-service.html
├── babel.config.js
├── tsconfig.json
└── package.json
```

## Setup

Requires Node.js 18+, PostgreSQL 14+, and a package manager (npm shown
below). You'll also want the Expo Go app on your phone (fastest way to
test), or Android Studio / Xcode for simulators.

See **"Running the full stack"** above for backend setup — the app won't
have any statuses/auth to show without it running.

```bash
# Mobile app
npm install
npx expo start
```

Scan the QR code that appears with Expo Go (Android) or the Camera app (iOS)
to run it on a physical device — no simulator required.

### Run on Android

```bash
# Requires Android Studio + an emulator, or a device with Expo Go
npx expo start --android
```

### Run in iOS-compatible mode

```bash
# Requires Xcode + iOS Simulator on macOS, or a device with Expo Go
npx expo start --ios
```

### Type-check

```bash
npx tsc --noEmit               # mobile app (repo root)
cd backend && npm run typecheck  # backend
```

## Building for testing / release

See **[`BUILD.md`](BUILD.md)** for the full guide (one-time setup,
development builds, Android APK/AAB, iOS builds, store submission, and a
pre-submission checklist of what's still a placeholder). Quick reference:

```bash
npm install -g eas-cli && eas login && eas init   # one-time setup

eas build --platform android --profile preview       # Android APK, no store needed
eas build --platform android --profile production      # Android AAB, for Google Play
eas build --platform ios --profile production            # iOS, for the App Store

eas submit --platform android --profile production        # upload AAB to Play Console
eas submit --platform ios --profile production               # upload build to App Store Connect
```

## Git

```bash
git init
git add .
git commit -m "Phase 1-6: Expo shell + Express/PostgreSQL backend, uploads/downloads/creators, notifications/recommendations/admin dashboard, tests + Docker deployment, EAS build config"

# after creating an empty repo on GitHub:
git branch -M main
git remote add origin https://github.com/<your-username>/status-app.git
git push -u origin main
```

## Verifying Phase 1 + 2 + 3 + 4 + 5

1. Start Postgres + backend (`backend/README.md`), then `npm install && npx expo start` at the repo root
2. Open in Expo Go → you should land on Onboarding on first launch
3. Tap **Continue as Guest** → lands on Home with mood chips, Trending Now,
   Fresh Drops — all pulled from `GET /api/statuses/*`
4. Tap Profile tab → guest upsell screen with **Create Account**
5. Sign up with a valid name/username/email/8+ char matching passwords →
   `POST /api/auth/signup` fires, redirected to Home, Profile now shows the
   real account (stats start at 0)
6. Toggle device dark/light mode → app follows system theme (or override it
   in Settings → Appearance)
7. Tap a heart on a status card → `POST /api/statuses/:id/favorite` fires;
   pull-to-refresh or revisit Profile → My Favorites to see it listed
8. Create tab → **Upload Image** (or **Upload Video**, ≤30s) → fill in
   title + category → **Preview** → **Publish Status** → real file lands in
   `backend/uploads/` and the status shows up on Home
9. Tap **Download** on any status card → progress %, then "Saved" — check
   your device's Photos/gallery app for the file, and Profile's
   `totalDownloads` for the updated count
10. Tap the share icon on a card → native share sheet opens
11. Tap a `@username` on any card → creator profile with stats and popular
    statuses → tap **Follow** → Profile → Following shows their statuses
12. Tap the bell icon on Home → Notifications shows the WELCOME notification
    from signup, with an unread badge that clears once you view it
13. Home now shows a **For You** rail above Trending Now — favorite a few
    statuses in one category, pull-to-refresh, and watch it re-rank toward
    that category
14. Profile → Settings → toggle a notification preference off → force-quit
    and reopen the app → the toggle stayed off (synced server-side)
15. Open `http://localhost:8080` (after starting the admin dashboard per
    "Running the full stack") → sign in as `admin` / `ChangeMe123!` →
    Overview shows live analytics **and a 7-day activity table** (new in
    Phase 5), Content lets you reject/restore a status, Users lets you
    ban/unban
16. `cd backend && npm test` → 29 passing tests
17. `npx tsc --noEmit` (repo root) and `cd backend && npm run typecheck` →
    no type errors in either project
18. `cd backend && docker compose up -d` (requires Docker) → API + Postgres
    come up in containers; `docker compose exec api npm run migrate` then
    hits the same `/api/health` endpoint successfully

## Verified in Phase 6

- `app.json` / `eas.json` validated as syntactically correct and reviewed
  for store-readiness (bundle IDs, versioning, permissions, build profiles)
- Found and fixed `assets/icon.png` shipping with an alpha channel (fully
  opaque, but present) — Apple's iOS icon validation rejects any alpha
  channel on the primary app icon regardless of visible transparency.
  Flattened to true RGB; same visual icon, removes the submission risk.
- Found and fixed `eas.json`'s `production` profile setting
  `autoIncrement` twice (once correctly at the profile root, once
  incorrectly as a string under `ios`) — cross-checked against Expo's
  current documentation for `appVersionSource: "remote"`, which specifies
  a single root-level `"autoIncrement": true` covering both platforms.
  Removed the incorrect nested version.
- `npx expo-doctor` run against the project — 14/17 checks passed locally;
  the remaining 3 only fail because they call Expo's version-compatibility
  API, which isn't reachable from this sandbox (no real project issue)
- Found and removed a stale, committed `android/` native folder left over
  from an earlier scaffolding pass that had drifted out of sync with
  `app.json` (missing newer permissions, had unused leftover ones) — kept
  the project on Expo's managed workflow instead, where EAS Build always
  regenerates native config fresh from `app.json`
- Added standalone, publicly-hostable `legal/privacy-policy.html` and
  `legal/terms-of-service.html` — the existing in-app screens
  (`app/privacy.tsx`, `app/terms.tsx`) can't satisfy either store's
  requirement for a live public URL on their own
- Mobile app still typechecks clean after all the above changes

## What's left (spec Phase 6, needs real accounts/network this sandbox lacks)

Actually running `eas build`/`eas submit` requires a real Expo account, and
`eas submit` further requires real Apple Developer / Google Play Console
accounts and credentials — none of which exist in this sandbox, and EAS's
build servers aren't reachable from here either. `BUILD.md`'s checklist
covers exactly what to fill in (branded icons, a public privacy policy URL,
production API URL, Apple/Google account details) before running the
commands for real.
