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
-- Sound Library (Music + Islamic Audio)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sound_artists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'ARTIST' CHECK (role IN ('ARTIST', 'RECITER')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sound_genres (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sound_moods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  emoji       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- Quran Surah metadata (name/ayat-count accuracy matters per spec) — used to
-- power "search Quran by Surah" and to label Quran-category sounds.
CREATE TABLE IF NOT EXISTS quran_surahs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number                INTEGER NOT NULL UNIQUE CHECK (number BETWEEN 1 AND 114),
  name_arabic           TEXT NOT NULL,
  name_transliteration  TEXT NOT NULL,
  name_english          TEXT NOT NULL,
  ayat_count            INTEGER NOT NULL,
  revelation_place       TEXT NOT NULL CHECK (revelation_place IN ('MECCA', 'MEDINA'))
);

CREATE TABLE IF NOT EXISTS sounds (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                TEXT NOT NULL,
  subtitle             TEXT, -- free-text artist/reciter fallback when artist_id isn't set
  category             TEXT NOT NULL CHECK (category IN ('MUSIC', 'ISLAMIC')),
  islamic_subcategory  TEXT CHECK (islamic_subcategory IN ('QURAN', 'NAAT', 'HAMD', 'DUA', 'AZKAR', 'DUROOD', 'BAYAN')),
  genre_id             UUID REFERENCES sound_genres (id),
  mood_id              UUID REFERENCES sound_moods (id),
  artist_id            UUID REFERENCES sound_artists (id),
  surah_id             UUID REFERENCES quran_surahs (id),
  ayat_start           INTEGER,
  ayat_end             INTEGER,
  artwork_url          TEXT,
  audio_url            TEXT NOT NULL,
  duration_sec         INTEGER NOT NULL,
  allow_trim           BOOLEAN NOT NULL DEFAULT TRUE,
  min_trim_sec         INTEGER NOT NULL DEFAULT 5,
  max_trim_sec         INTEGER NOT NULL DEFAULT 60,
  usage_count          INTEGER NOT NULL DEFAULT 0,
  favorite_count       INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'HIDDEN')),
  -- Content/rights status (spec section 14): every audio item must carry a
  -- clear source so the library never silently serves unlicensed audio.
  source               TEXT NOT NULL DEFAULT 'LICENSED' CHECK (source IN ('LICENSED', 'ROYALTY_FREE', 'PUBLIC_DOMAIN', 'USER_UPLOADED')),
  license_note         TEXT,
  attribution          TEXT,
  uploader_id          UUID REFERENCES users (id) ON DELETE SET NULL, -- set when source = USER_UPLOADED
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (category = 'ISLAMIC' OR islamic_subcategory IS NULL),
  CHECK (islamic_subcategory != 'QURAN' OR surah_id IS NOT NULL OR category != 'ISLAMIC')
);
CREATE INDEX IF NOT EXISTS idx_sounds_category ON sounds (category);
CREATE INDEX IF NOT EXISTS idx_sounds_islamic_subcategory ON sounds (islamic_subcategory);
CREATE INDEX IF NOT EXISTS idx_sounds_usage_count ON sounds (usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_sounds_status ON sounds (status);
CREATE INDEX IF NOT EXISTS idx_sounds_title_trgm ON sounds (lower(title));
CREATE INDEX IF NOT EXISTS idx_sounds_surah ON sounds (surah_id);

CREATE TABLE IF NOT EXISTS sound_favorites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  sound_id    UUID NOT NULL REFERENCES sounds (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sound_id)
);
CREATE INDEX IF NOT EXISTS idx_sound_favorites_user ON sound_favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_sound_favorites_sound ON sound_favorites (sound_id);

-- Links a published status/video to the sound it used, plus the exact trim
-- range and the two independent volume levels selected in the editor
-- (spec sections 9/10: "Preserve the selected trim range" / "Preview the
-- final audio mix"). Nullable — most statuses still have no sound attached.
ALTER TABLE statuses ADD COLUMN IF NOT EXISTS sound_id UUID REFERENCES sounds (id) ON DELETE SET NULL;
ALTER TABLE statuses ADD COLUMN IF NOT EXISTS sound_start_sec NUMERIC(6, 2);
ALTER TABLE statuses ADD COLUMN IF NOT EXISTS sound_end_sec NUMERIC(6, 2);
ALTER TABLE statuses ADD COLUMN IF NOT EXISTS sound_volume NUMERIC(3, 2) NOT NULL DEFAULT 1;
ALTER TABLE statuses ADD COLUMN IF NOT EXISTS original_volume NUMERIC(3, 2) NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_statuses_sound_id ON statuses (sound_id);

-- ---------------------------------------------------------------------------
-- Direct Messages (friend-to-friend chat)
-- ---------------------------------------------------------------------------

-- One row per pair of users. user_one_id/user_two_id are always stored with
-- the smaller UUID first (enforced below) so a conversation between A and B
-- can never be created twice regardless of who starts it.
CREATE TABLE IF NOT EXISTS conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_one_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  user_two_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  last_message_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_one_id <> user_two_id),
  CHECK (user_one_id < user_two_id),
  UNIQUE (user_one_id, user_two_id)
);
CREATE INDEX IF NOT EXISTS idx_conversations_user_one ON conversations (user_one_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_two ON conversations (user_two_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations (last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body             TEXT NOT NULL,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages (conversation_id, is_read) WHERE is_read = FALSE;

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
