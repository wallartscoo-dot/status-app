-- Status App — PostgreSQL schema (Phase 2)
-- Applied by `npm run migrate`. Idempotent: safe to re-run.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Users & Auth
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      TEXT NOT NULL,
  username       TEXT NOT NULL UNIQUE,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  is_banned      BOOLEAN NOT NULL DEFAULT FALSE,
  is_creator     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

CREATE TABLE IF NOT EXISTS profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  avatar_url       TEXT,
  bio              TEXT,
  total_downloads  INTEGER NOT NULL DEFAULT 0,
  total_favorites  INTEGER NOT NULL DEFAULT 0,
  total_uploads    INTEGER NOT NULL DEFAULT 0,
  follower_count   INTEGER NOT NULL DEFAULT 0,
  notification_prefs JSONB NOT NULL DEFAULT '{"favorites":true,"newFromCreator":true,"trending":true,"system":true}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Phase 4: adds notification_prefs to installs that already ran this schema
-- before this column existed (CREATE TABLE IF NOT EXISTS is a no-op then).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL
  DEFAULT '{"favorites":true,"newFromCreator":true,"trending":true,"system":true}'::jsonb;

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  emoji       TEXT,
  icon_url    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS statuses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT,
  type           TEXT NOT NULL CHECK (type IN ('VIDEO', 'IMAGE', 'QUOTE')),
  media_url      TEXT NOT NULL,
  thumbnail_url  TEXT,
  duration_sec   INTEGER,
  file_size      INTEGER,
  mime_type      TEXT,
  view_count     INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  favorite_count INTEGER NOT NULL DEFAULT 0,
  visibility     TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (visibility IN ('PENDING', 'PUBLISHED', 'REJECTED', 'REMOVED')),
  is_featured    BOOLEAN NOT NULL DEFAULT FALSE,
  creator_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_id    UUID NOT NULL REFERENCES categories (id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_statuses_category ON statuses (category_id);
CREATE INDEX IF NOT EXISTS idx_statuses_creator ON statuses (creator_id);
CREATE INDEX IF NOT EXISTS idx_statuses_visibility ON statuses (visibility);
CREATE INDEX IF NOT EXISTS idx_statuses_created_at ON statuses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_statuses_download_count ON statuses (download_count DESC);
CREATE INDEX IF NOT EXISTS idx_statuses_view_count ON statuses (view_count DESC);
-- Case-insensitive search over title/description
CREATE INDEX IF NOT EXISTS idx_statuses_title_trgm ON statuses (lower(title));

CREATE TABLE IF NOT EXISTS hashtags (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS status_hashtags (
  status_id   UUID NOT NULL REFERENCES statuses (id) ON DELETE CASCADE,
  hashtag_id  UUID NOT NULL REFERENCES hashtags (id) ON DELETE CASCADE,
  PRIMARY KEY (status_id, hashtag_id)
);
CREATE INDEX IF NOT EXISTS idx_status_hashtags_hashtag ON status_hashtags (hashtag_id);

-- ---------------------------------------------------------------------------
-- Engagement
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status_id  UUID NOT NULL REFERENCES statuses (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, status_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_status ON favorites (status_id);

CREATE TABLE IF NOT EXISTS downloads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status_id  UUID NOT NULL REFERENCES statuses (id) ON DELETE CASCADE,
  state      TEXT NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads (user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads (status_id);

CREATE TABLE IF NOT EXISTS follows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  following_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows (following_id);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('WELCOME', 'TRENDING', 'FAVORITE', 'NEW_FROM_CREATOR', 'SYSTEM')),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, is_read);

CREATE TABLE IF NOT EXISTS reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id    UUID NOT NULL REFERENCES statuses (id) ON DELETE CASCADE,
  reporter_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reason       TEXT NOT NULL CHECK (reason IN ('COPYRIGHT', 'SPAM', 'OFFENSIVE', 'VIOLENCE', 'SEXUAL_CONTENT', 'HARASSMENT', 'OTHER')),
  details      TEXT,
  state        TEXT NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN', 'REVIEWED', 'DISMISSED')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status_id);
CREATE INDEX IF NOT EXISTS idx_reports_state ON reports (state);

-- ---------------------------------------------------------------------------
-- Analytics (Phase 5)
-- ---------------------------------------------------------------------------

-- Lightweight event log: screen views and key actions (signup, upload,
-- download, favorite, share, follow, search). Deliberately schema-light
-- (one JSONB metadata column) rather than a table per event type, since
-- event shapes evolve fast and this is an internal analytics stream, not a
-- source of truth for anything transactional (those live in their own
-- tables — favorites, downloads, etc. — with proper constraints).
CREATE TABLE IF NOT EXISTS analytics_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users (id) ON DELETE SET NULL, -- nullable: guests emit events too
  event_type TEXT NOT NULL,
  metadata   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created ON analytics_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events (user_id);

-- ---------------------------------------------------------------------------
-- updated_at auto-touch trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_statuses_updated_at ON statuses;
CREATE TRIGGER trg_statuses_updated_at BEFORE UPDATE ON statuses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
