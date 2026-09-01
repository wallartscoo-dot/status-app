# Status App — Backend (Phase 2 + 3 + 4 + 5)

Express + TypeScript REST API backed by PostgreSQL. Implements
authentication, users, categories, statuses (list/trending/search/
by-category/by-id), favorites, reporting, real video/image uploads,
downloads, creator profiles, follows/following feed, notifications,
personalized recommendations, a full admin API + web dashboard,
**analytics event tracking, an automated test suite, and Docker-based
production deployment.**

## Stack

- Express 4 + TypeScript
- PostgreSQL (raw SQL via `pg`, no ORM)
- JWT access + refresh tokens, `bcryptjs` password hashing
- `zod` request validation, `express-rate-limit` on auth routes, `helmet` + `cors` + `compression`

## Setup

Requires Node.js 18+ and a running PostgreSQL 14+ instance.

```bash
# 1. Install dependencies
npm install

# 2. Copy env and fill in real values (never commit .env)
cp .env.example .env
# Edit DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET at minimum.
# Generate strong secrets with:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Create the database (adjust for your Postgres setup)
psql -U postgres -c "CREATE DATABASE statusapp;"

# 4. Run the migration (creates all tables from src/db/schema.sql)
npm run migrate

# 5. Seed categories + demo accounts + sample statuses
npm run seed

# 6. Start the dev server (auto-reloads on file changes)
npm run dev
```

The API listens on `http://localhost:4000` by default (`PORT` in `.env`).
Health check: `GET /api/health`.

### Demo accounts created by `npm run seed`

| Role    | Email                        | Username       | Password      |
|---------|-------------------------------|----------------|----------------|
| Admin   | admin@statusapp.dev          | admin          | ChangeMe123!   |
| Creator | creator@statusapp.dev        | demo_creator   | ChangeMe123!   |

The seed also creates 20 categories (matching spec section 8) and 8 sample
statuses across them, with placeholder media (picsum photos / a sample MP4)
so trending, search, and category browsing all have real data — swap for
real cloud-storage URLs once Phase 3 adds the upload pipeline.

## Scripts

```bash
npm run dev         # tsx watch — dev server with hot reload
npm run build        # tsc -> dist/
npm start            # node dist/index.js (run the built server)
npm run migrate       # apply src/db/schema.sql
npm run seed          # seed categories + demo accounts + sample statuses
npm run typecheck     # tsc --noEmit
```

## Project structure

```
backend/
├── src/
│   ├── index.ts              # entrypoint — starts the HTTP server
│   ├── app.ts                 # Express app: middleware + route mounting
│   ├── config/
│   │   ├── env.ts              # typed env var loading/validation
│   │   └── db.ts                # pg Pool
│   ├── db/
│   │   ├── schema.sql            # full Postgres schema (11 tables)
│   │   ├── migrate.ts             # applies schema.sql
│   │   └── seed.ts                # categories + demo accounts + sample statuses
│   ├── middleware/
│   │   ├── auth.ts                 # requireAuth / optionalAuth (JWT verify)
│   │   ├── validate.ts              # zod request validation middleware
│   │   └── errorHandler.ts           # central error -> JSON response
│   ├── routes/                        # one file per resource, mounted in routes/index.ts
│   ├── controllers/                    # request handlers
│   ├── services/                        # DB query logic, kept separate from controllers
│   ├── validators/                       # zod schemas per resource
│   ├── utils/
│   │   ├── jwt.ts                          # sign/verify access + refresh tokens
│   │   ├── password.ts                      # bcrypt hash/compare
│   │   ├── ApiError.ts                       # typed error -> HTTP status mapping
│   │   ├── asyncHandler.ts                    # wraps async route handlers
│   │   └── serializers.ts                      # DB row -> API JSON shape
│   └── types/db.ts                              # row types matching schema.sql
├── .env.example
├── package.json
└── tsconfig.json
```

## API reference

All responses are JSON. Errors follow `{ "error": { "code", "message", "details"? } }`.
Authenticated routes expect `Authorization: Bearer <accessToken>`.

### Auth

| Method | Path                        | Auth | Notes |
|--------|-----------------------------|------|-------|
| POST   | `/api/auth/signup`           | —    | `fullName, username, email, password, confirmPassword` |
| POST   | `/api/auth/login`             | —    | `identifier` (email or username), `password` |
| POST   | `/api/auth/refresh`            | —    | `refreshToken` -> new access + refresh token pair |
| POST   | `/api/auth/forgot-password`     | —    | `email` — stubbed; logs instead of sending real email |
| POST   | `/api/auth/logout`               | —    | Stateless JWT logout (client discards tokens) |

### Users

| Method | Path              | Auth | Notes |
|--------|--------------------|------|-------|
| GET    | `/api/users/me`     | ✅   | Current user + profile |
| PATCH  | `/api/users/me`      | ✅   | `fullName?, bio?, avatarUrl?` |

### Categories

| Method | Path                | Auth | Notes |
|--------|----------------------|------|-------|
| GET    | `/api/categories`     | ✅   | All 20 categories with live status counts |

### Statuses

| Method | Path                              | Auth       | Notes |
|--------|-------------------------------------|------------|-------|
| GET    | `/api/statuses`                      | optional   | Paginated, newest first. `?page=&limit=` |
| GET    | `/api/statuses/trending`              | optional   | Sorted by view/download count. `?limit=` |
| GET    | `/api/statuses/search`                 | optional   | `?q=` matches title/description/hashtags/creator |
| GET    | `/api/statuses/category/:category`      | optional   | `:category` is the category `key` |
| GET    | `/api/statuses/:id`                      | optional   | Single status detail |
| POST   | `/api/statuses/:id/favorite`              | ✅         | Idempotent — `{ alreadyFavorited: boolean }` |
| DELETE | `/api/statuses/:id/favorite`               | ✅         | Idempotent |
| POST   | `/api/statuses/:id/download`                | ✅         | Records a download, bumps counters, returns `mediaUrl` for the client to save |
| POST   | `/api/statuses/:id/report`                   | ✅         | `reason` (enum from spec section 18), `details?` |
| POST   | `/api/statuses/upload`                        | ✅         | **Real file upload (Phase 3).** `multipart/form-data`: `media` (file), `title`, `description?`, `type` (`VIDEO`\|`IMAGE`), `categoryKey`, `durationSec` (required for VIDEO, max 30), `hashtags` (comma-separated string) |
| POST   | `/api/statuses`                                | ✅         | Metadata-only creation (Phase 2 behavior) — for `QUOTE` statuses or admin/seed tooling that already has a hosted `mediaUrl` |

### Downloads

| Method | Path             | Auth | Notes |
|--------|-------------------|------|-------|
| GET    | `/api/downloads`   | ✅   | Current user's download history, paginated, newest first |

### Creators

| Method | Path                     | Auth       | Notes |
|--------|----------------------------|------------|-------|
| GET    | `/api/creators/:username`   | optional   | Profile + follower/following/upload/download counts + `isFollowing` + up to 12 popular statuses |

### Follows

| Method | Path                    | Auth | Notes |
|--------|---------------------------|------|-------|
| POST   | `/api/follows/:userId`     | ✅   | Idempotent — `{ alreadyFollowing: boolean }` |
| DELETE | `/api/follows/:userId`      | ✅   | Idempotent, `204 No Content` |
| GET    | `/api/follows/feed`          | ✅   | "Following" feed (spec section 15) — statuses from creators the user follows, paginated |

### Favorites

| Method | Path             | Auth | Notes |
|--------|-------------------|------|-------|
| GET    | `/api/favorites`   | ✅   | Current user's favorited statuses, paginated |

### Notifications (Phase 4)

| Method | Path                          | Auth | Notes |
|--------|--------------------------------|------|-------|
| GET    | `/api/notifications`           | ✅   | Paginated, newest first, includes `unreadCount` |
| PATCH  | `/api/notifications/:id/read`   | ✅   | Marks one notification read |
| POST   | `/api/notifications/read-all`    | ✅   | Marks all read |

Notifications are created automatically: signup (`WELCOME`, always sent
regardless of prefs), a status getting favorited (`FAVORITE`, to the
creator), a followed creator publishing (`NEW_FROM_CREATOR`, fanned out to
all followers), and a status crossing a download milestone — 10/50/100/500/
1000 (`TRENDING`, to the creator). Each type except `WELCOME` respects the
recipient's `notificationPrefs` (see below) and is skipped if muted.

### Personalized recommendations (Phase 4)

| Method | Path                    | Auth       | Notes |
|--------|---------------------------|------------|-------|
| GET    | `/api/statuses/for-you`    | optional   | `?limit=`. Weights the user's most-favorited/downloaded categories; falls back to trending for guests or accounts with no history yet, and tops up short results with trending so it always returns a full page. |

### Admin (Phase 4)

Every route below requires `Authorization: Bearer <token>` for a user with
`role: 'ADMIN'` (the seeded `admin` account, or promote another user by
setting `role = 'ADMIN'` directly in the `users` table). Non-admins get a
`403 FORBIDDEN`.

| Method | Path                          | Notes |
|--------|--------------------------------|-------|
| GET    | `/api/admin/analytics`         | Total/active users, total statuses/downloads/favorites, open reports, top 5 trending |
| GET    | `/api/admin/users`              | `?search=&page=&limit=` — matches username/email/full name |
| PATCH  | `/api/admin/users/:id/ban`       | `{ banned: boolean }` — banned users are blocked from logging in |
| GET    | `/api/admin/statuses`             | `?visibility=&page=&limit=` — every status regardless of visibility |
| PATCH  | `/api/admin/statuses/:id`          | `{ visibility?, isFeatured? }` — approve (`PUBLISHED`)/reject/remove, or feature |
| DELETE | `/api/admin/statuses/:id`           | Hard delete |
| GET    | `/api/admin/reports`                 | `?state=&page=&limit=` |
| PATCH  | `/api/admin/reports/:id`              | `{ state: 'REVIEWED' \| 'DISMISSED' \| 'OPEN' }` |
| GET    | `/api/admin/categories`                | All categories with live status counts |
| POST   | `/api/admin/categories`                 | `{ key, label, emoji?, sortOrder }` |
| PATCH  | `/api/admin/categories/:id`              | `{ label?, emoji?, sortOrder? }` |

Admin authorization re-checks `role`/`is_banned` from the database on every
request (`middleware/auth.ts`'s `requireAdmin`) rather than trusting the
`role` claim baked into the access token — so a promotion, demotion, or ban
takes effect on the very next request instead of waiting for the token to
expire and refresh.

### Analytics (Phase 5)

| Method | Path                      | Auth       | Notes |
|--------|-----------------------------|------------|-------|
| POST   | `/api/analytics/events`      | optional   | `{ eventType, metadata? }`. Always responds `202` — analytics must never block or fail a user action. |

`eventType` must be one of the allow-listed values in
`src/services/analytics.service.ts` (`screen_view`, `signup_completed`,
`login_completed`, `status_published`, `status_downloaded`,
`status_favorited`, `status_unfavorited`, `status_shared`,
`creator_followed`, `search_performed`) — add new ones there first. A 7-day
rolling summary (`eventSummary7d`) is included in
`GET /api/admin/analytics` and shown on the admin dashboard's Overview tab.

### Notification preferences

`PATCH /api/users/me` accepts an optional `notificationPrefs` object that's
**merged**, not replaced, with the user's existing preferences:

```json
{ "notificationPrefs": { "trending": false } }
```

Valid keys: `favorites`, `newFromCreator`, `trending`, `system`. All default
to `true`. `GET /api/users/me` returns the current values under
`user.profile.notificationPrefs`.

`optional` auth routes return `isFavorited: false` for anonymous/guest requests
and the real value for authenticated ones — this is how the guest-browsing
requirement from spec section 4 is satisfied without gating read access.

## Admin web dashboard

`../admin/` is a standalone static web app (plain HTML/CSS/JS, no build
step) for the endpoints above: analytics overview, user search + ban/unban,
content moderation (approve/reject/remove/feature/delete), report review,
and category management.

```bash
cd ../admin
python3 -m http.server 8080
# or: npx serve .
```

Open `http://localhost:8080`, sign in with the seeded `admin /
ChangeMe123!` account (or any user with `role: 'ADMIN'`), and set the API
URL on the login screen if the backend isn't at the default
`http://localhost:4000`. The backend's CORS config already allows
cross-origin requests from any origin in development (`CORS_ORIGIN=*`) — set
`CORS_ORIGIN` to the dashboard's real deployed origin in production.

## Testing

```bash
npm test              # runs the Vitest + Supertest suite (auth, statuses/favorites, admin)
```

Tests run against a separate `statusapp_test` database (never your dev
database) — create it once with `psql -U postgres -c "CREATE DATABASE
statusapp_test;"`. `tests/env.ts` points `DATABASE_URL` at it
automatically; override with `TEST_DATABASE_URL` if you need a different
connection string (e.g. in CI). Tables are truncated between test files, not
individual tests within a file, so tests within a file share state — see
`tests/setup.ts`'s `truncateAll()`.

## Production deployment

### Docker (recommended)

```bash
# Everything containerized (Postgres + API):
docker compose up -d
docker compose exec api npm run migrate
docker compose exec api npm run seed   # optional — demo data only, skip in real production

# Or just Postgres in a container, API via `npm run dev` locally:
docker compose up -d db
```

**Before deploying for real:**
1. Replace both JWT secrets in `docker-compose.yml` (or your real `.env`) —
   the committed values are placeholders. Generate with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
2. Set `CORS_ORIGIN` to your actual app/admin-dashboard origins, not `*`.
3. Put a reverse proxy (nginx, Caddy, your cloud LB) in front of the API for
   TLS termination — the app itself serves plain HTTP.
4. Swap the local-disk storage adapter (`src/config/storage.ts`) for S3/
   Cloudinary/etc. before running more than one API instance, or mount a
   shared volume — the `uploads_data` Docker volume is single-host only.
5. Point `DATABASE_URL` at a managed Postgres instance with backups enabled;
   add `?sslmode=require` for providers that need it (RDS, Supabase, Neon).
6. Run `npm run migrate` against production on every deploy that changes
   `schema.sql` — it's idempotent (`CREATE TABLE IF NOT EXISTS` / `ADD
   COLUMN IF NOT EXISTS` throughout), safe to run repeatedly.
7. `npm run build` also copies `schema.sql` into `dist/db/` via the
   `postbuild` script — `npm run migrate`/`npm start` against `dist/` won't
   work without it, so don't skip `npm run build` in favor of just `tsc`.

### Without Docker

```bash
npm ci --omit=dev    # or npm install --omit=dev
npm run build          # tsc + copies schema.sql into dist/db/
npm run migrate          # once, and again on every schema change
npm start                 # node dist/index.js
```

Run behind a process manager (systemd, PM2, or your platform's equivalent)
so a crash restarts the process — `src/index.ts` already exits cleanly on
`SIGTERM`/`SIGINT` and on uncaught exceptions/unhandled rejections, which
plays well with any supervisor's restart policy.

## Notes / what's intentionally deferred to later phases

- **Video thumbnails:** no `ffmpeg` frame-extraction yet — video statuses
  currently have `thumbnailUrl: null` (the mobile app falls back to showing
  the first frame via the video player, or you can extend `storage.ts` to
  generate one at upload time).
- **QUOTE uploads:** the Create screen's "Quote" option isn't wired to a file
  upload (quotes have no file) — use `POST /api/statuses` directly with a
  pre-hosted `mediaUrl` (e.g. a rendered quote-card image) for now.
- **Async download processing:** `POST /api/statuses/:id/download` completes
  synchronously (state goes straight to `COMPLETED`). The schema already
  supports `PENDING`/`PROCESSING`/`FAILED` for whenever real
  transcoding/processing is added.
- **Pre-publish moderation queue:** uploads auto-publish (`visibility:
  'PUBLISHED'`) immediately rather than starting `PENDING` for admin review.
  The moderation endpoints (`PATCH /api/admin/statuses/:id`) work either way
  — flipping the default in `status.service.ts`'s `createStatus` to
  `PENDING` would turn on a pre-publish queue without any other changes.
- **Admin login:** there's no separate admin login endpoint — admins sign in
  through the normal `POST /api/auth/login`; `requireAdmin` re-checks the
  role/ban status from the database on each request rather than trusting a
  token claim (see the Admin section above).
- **Forgot password (Phase 2, stubbed):** validates the email and returns a
  generic success message without actually sending an email — wire up a
  transactional email provider before this reaches production.
- **Crash reporting:** the mobile app's `ErrorBoundary`
  (`src/components/ErrorBoundary.tsx`) and the backend's global error
  handler both log to the console with a clearly marked spot to wire up a
  real service (Sentry, Bugsnag, etc.) — neither is connected to one yet.
- **Response caching:** reads (categories, trending, search) hit Postgres
  directly on every request. The indexes in `schema.sql` keep this fast at
  moderate scale, but a Redis or in-memory cache in front of the hottest
  read endpoints (`/api/statuses/trending`, `/api/categories`) is the next
  lever if query volume grows past what indexes alone can handle.

## Security notes for production

- Set `CORS_ORIGIN` to your actual app origin(s), not `*`.
- Rotate `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` to long random values —
  never reuse the `.env.example` placeholders.
- Put the database behind a private network / connection pooler (e.g.
  PgBouncer) before scaling past a single instance.
- Add `DATABASE_URL` SSL params (`?sslmode=require`) for managed Postgres
  providers (RDS, Supabase, Neon, etc.).
