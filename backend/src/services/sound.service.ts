import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import type {
  IslamicSubcategory,
  SoundCategory,
  SoundWithRelationsRow,
  StatusWithRelationsRow,
} from "../types/db";

// Shared SELECT joining artist + genre + mood + surah into one row, reused
// by every list/detail query below (mirrors status.service's BASE_SELECT).
const BASE_SELECT = `
  SELECT s.*,
         g.key AS genre_key, g.label AS genre_label,
         m.key AS mood_key, m.label AS mood_label, m.emoji AS mood_emoji,
         a.name AS artist_name, a.role AS artist_role, a.avatar_url AS artist_avatar_url,
         sur.number AS surah_number, sur.name_arabic AS surah_name_arabic,
         sur.name_transliteration AS surah_name_transliteration, sur.name_english AS surah_name_english
  FROM sounds s
  LEFT JOIN sound_genres g ON g.id = s.genre_id
  LEFT JOIN sound_moods m ON m.id = s.mood_id
  LEFT JOIN sound_artists a ON a.id = s.artist_id
  LEFT JOIN quran_surahs sur ON sur.id = s.surah_id
`;

function toPublicSound(sound: SoundWithRelationsRow, viewerFavoriteIds?: Set<string>) {
  return {
    id: sound.id,
    title: sound.title,
    // Prefer the linked artist/reciter's name; fall back to the free-text
    // subtitle (e.g. a recording whose reciter isn't yet in sound_artists).
    artist: sound.artist_name ?? sound.subtitle,
    artistRole: sound.artist_role,
    artistAvatarUrl: sound.artist_avatar_url,
    category: sound.category,
    islamicSubcategory: sound.islamic_subcategory,
    genre: sound.genre_key ? { key: sound.genre_key, label: sound.genre_label } : null,
    mood: sound.mood_key ? { key: sound.mood_key, label: sound.mood_label, emoji: sound.mood_emoji } : null,
    surah: sound.surah_number
      ? {
          number: sound.surah_number,
          nameArabic: sound.surah_name_arabic,
          nameTransliteration: sound.surah_name_transliteration,
          nameEnglish: sound.surah_name_english,
        }
      : null,
    ayatStart: sound.ayat_start,
    ayatEnd: sound.ayat_end,
    artworkUrl: sound.artwork_url,
    audioUrl: sound.audio_url,
    durationSec: sound.duration_sec,
    allowTrim: sound.allow_trim,
    minTrimSec: sound.min_trim_sec,
    maxTrimSec: sound.max_trim_sec,
    usageCount: sound.usage_count,
    favoriteCount: sound.favorite_count,
    source: sound.source,
    licenseNote: sound.license_note,
    attribution: sound.attribution,
    isFavorited: viewerFavoriteIds ? viewerFavoriteIds.has(sound.id) : undefined,
    createdAt: sound.created_at,
  };
}

async function favoriteIdsFor(userId: string | undefined, soundIds: string[]): Promise<Set<string>> {
  if (!userId || soundIds.length === 0) return new Set();
  const { rows } = await pool.query<{ sound_id: string }>(
    "SELECT sound_id FROM sound_favorites WHERE user_id = $1 AND sound_id = ANY($2::uuid[])",
    [userId, soundIds]
  );
  return new Set(rows.map((r) => r.sound_id));
}

function paginate(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export interface ListSoundsParams {
  page: number;
  limit: number;
  category?: SoundCategory;
  islamicSubcategory?: IslamicSubcategory;
  genre?: string;
  mood?: string;
  surahNumber?: number;
  viewerId?: string;
}

export async function listSounds(params: ListSoundsParams) {
  const { page, limit, category, islamicSubcategory, genre, mood, surahNumber, viewerId } = params;
  const offset = (page - 1) * limit;

  const conditions = ["s.status = 'ACTIVE'"];
  const values: unknown[] = [];
  if (category) {
    values.push(category);
    conditions.push(`s.category = $${values.length}`);
  }
  if (islamicSubcategory) {
    values.push(islamicSubcategory);
    conditions.push(`s.islamic_subcategory = $${values.length}`);
  }
  if (genre) {
    values.push(genre);
    conditions.push(`g.key = $${values.length}`);
  }
  if (mood) {
    values.push(mood);
    conditions.push(`m.key = $${values.length}`);
  }
  if (surahNumber) {
    values.push(surahNumber);
    conditions.push(`sur.number = $${values.length}`);
  }
  const where = conditions.join(" AND ");

  const countQuery = `
    SELECT COUNT(*) FROM sounds s
    LEFT JOIN sound_genres g ON g.id = s.genre_id
    LEFT JOIN sound_moods m ON m.id = s.mood_id
    LEFT JOIN quran_surahs sur ON sur.id = s.surah_id
    WHERE ${where}`;
  const listQuery = `${BASE_SELECT} WHERE ${where} ORDER BY s.created_at DESC LIMIT $${
    values.length + 1
  } OFFSET $${values.length + 2}`;

  const [{ rows: countRows }, { rows: soundRows }] = await Promise.all([
    pool.query<{ count: string }>(countQuery, values),
    pool.query<SoundWithRelationsRow>(listQuery, [...values, limit, offset]),
  ]);

  const total = Number(countRows[0].count);
  const favIds = await favoriteIdsFor(viewerId, soundRows.map((s) => s.id));

  return { items: soundRows.map((s) => toPublicSound(s, favIds)), ...paginate(page, limit, total) };
}

/**
 * Trending sounds (spec: "update dynamically based on sound usage").
 * Deliberately computed live from `usage_count` rather than a cached/cron
 * "is_trending" flag, so a sound climbs or falls the moment videos are
 * published or removed with it attached.
 */
export async function trendingSounds(params: { page: number; limit: number; category?: SoundCategory; viewerId?: string }) {
  const { page, limit, category, viewerId } = params;
  const offset = (page - 1) * limit;

  const conditions = ["s.status = 'ACTIVE'", "s.usage_count > 0"];
  const values: unknown[] = [];
  if (category) {
    values.push(category);
    conditions.push(`s.category = $${values.length}`);
  }
  const where = conditions.join(" AND ");

  const countQuery = `SELECT COUNT(*) FROM sounds s WHERE ${where}`;
  const listQuery = `${BASE_SELECT} WHERE ${where} ORDER BY s.usage_count DESC, s.favorite_count DESC LIMIT $${
    values.length + 1
  } OFFSET $${values.length + 2}`;

  const [{ rows: countRows }, { rows: soundRows }] = await Promise.all([
    pool.query<{ count: string }>(countQuery, values),
    pool.query<SoundWithRelationsRow>(listQuery, [...values, limit, offset]),
  ]);

  const total = Number(countRows[0].count);
  const favIds = await favoriteIdsFor(viewerId, soundRows.map((s) => s.id));

  return { items: soundRows.map((s) => toPublicSound(s, favIds)), ...paginate(page, limit, total) };
}

export async function searchSounds(params: {
  q: string;
  page: number;
  limit: number;
  category?: SoundCategory;
  islamicSubcategory?: IslamicSubcategory;
  viewerId?: string;
}) {
  const { q, page, limit, category, islamicSubcategory, viewerId } = params;
  const offset = (page - 1) * limit;
  const like = `%${q.toLowerCase()}%`;

  const conditions = [
    "s.status = 'ACTIVE'",
    `(lower(s.title) LIKE $1
      OR lower(COALESCE(s.subtitle, '')) LIKE $1
      OR lower(COALESCE(a.name, '')) LIKE $1
      OR lower(COALESCE(g.label, '')) LIKE $1
      OR lower(COALESCE(m.label, '')) LIKE $1
      OR lower(COALESCE(sur.name_english, '')) LIKE $1
      OR lower(COALESCE(sur.name_transliteration, '')) LIKE $1)`,
  ];
  const values: unknown[] = [like];
  if (category) {
    values.push(category);
    conditions.push(`s.category = $${values.length}`);
  }
  if (islamicSubcategory) {
    values.push(islamicSubcategory);
    conditions.push(`s.islamic_subcategory = $${values.length}`);
  }
  const where = conditions.join(" AND ");

  const countQuery = `
    SELECT COUNT(*) FROM sounds s
    LEFT JOIN sound_artists a ON a.id = s.artist_id
    LEFT JOIN sound_genres g ON g.id = s.genre_id
    LEFT JOIN sound_moods m ON m.id = s.mood_id
    LEFT JOIN quran_surahs sur ON sur.id = s.surah_id
    WHERE ${where}`;
  const listQuery = `${BASE_SELECT} WHERE ${where} ORDER BY s.usage_count DESC LIMIT $${
    values.length + 1
  } OFFSET $${values.length + 2}`;

  const [{ rows: countRows }, { rows: soundRows }] = await Promise.all([
    pool.query<{ count: string }>(countQuery, values),
    pool.query<SoundWithRelationsRow>(listQuery, [...values, limit, offset]),
  ]);

  const total = Number(countRows[0].count);
  const favIds = await favoriteIdsFor(viewerId, soundRows.map((s) => s.id));

  return { items: soundRows.map((s) => toPublicSound(s, favIds)), ...paginate(page, limit, total), query: q };
}

export async function getSoundById(id: string, viewerId?: string) {
  const { rows } = await pool.query<SoundWithRelationsRow>(`${BASE_SELECT} WHERE s.id = $1`, [id]);
  const sound = rows[0];
  if (!sound || sound.status !== "ACTIVE") throw ApiError.notFound("Sound not found");

  const favIds = await favoriteIdsFor(viewerId, [sound.id]);
  return toPublicSound(sound, favIds);
}

/** Vertical feed of videos published using this sound (Sound Detail Page). */
export async function listVideosForSound(soundId: string, params: { page: number; limit: number; viewerId?: string }) {
  const { rows: soundRows } = await pool.query("SELECT id FROM sounds WHERE id = $1", [soundId]);
  if (!soundRows[0]) throw ApiError.notFound("Sound not found");

  const { page, limit, viewerId } = params;
  const offset = (page - 1) * limit;

  const STATUS_SELECT = `
    SELECT st.*,
           c.key AS category_key, c.label AS category_label, c.emoji AS category_emoji,
           u.username AS creator_username, u.full_name AS creator_full_name,
           p.avatar_url AS creator_avatar_url,
           '{}'::text[] AS hashtags
    FROM statuses st
    JOIN categories c ON c.id = st.category_id
    JOIN users u ON u.id = st.creator_id
    LEFT JOIN profiles p ON p.user_id = u.id
  `;
  const where = "st.sound_id = $1 AND st.visibility = 'PUBLISHED'";

  const [{ rows: countRows }, { rows: statusRows }] = await Promise.all([
    pool.query<{ count: string }>(`SELECT COUNT(*) FROM statuses st WHERE ${where}`, [soundId]),
    pool.query<StatusWithRelationsRow>(
      `${STATUS_SELECT} WHERE ${where} ORDER BY st.created_at DESC LIMIT $2 OFFSET $3`,
      [soundId, limit, offset]
    ),
  ]);

  const total = Number(countRows[0].count);
  const items = statusRows.map((s) => ({
    id: s.id,
    title: s.title,
    type: s.type,
    mediaUrl: s.media_url,
    thumbnailUrl: s.thumbnail_url,
    durationSec: s.duration_sec,
    viewCount: s.view_count,
    downloadCount: s.download_count,
    favoriteCount: s.favorite_count,
    category: { key: s.category_key, label: s.category_label, emoji: s.category_emoji },
    creator: { id: s.creator_id, username: s.creator_username, fullName: s.creator_full_name, avatarUrl: s.creator_avatar_url },
    createdAt: s.created_at,
  }));

  return { items, ...paginate(page, limit, total) };
}

export async function listSoundMeta() {
  const [{ rows: genres }, { rows: moods }] = await Promise.all([
    pool.query("SELECT key, label FROM sound_genres ORDER BY sort_order ASC"),
    pool.query("SELECT key, label, emoji FROM sound_moods ORDER BY sort_order ASC"),
  ]);
  return {
    genres: genres.map((g) => ({ key: g.key, label: g.label })),
    moods: moods.map((m) => ({ key: m.key, label: m.label, emoji: m.emoji })),
    islamicSubcategories: [
      { key: "QURAN", label: "Quran Recitation", emoji: "📖" },
      { key: "NAAT", label: "Naat", emoji: "🤲" },
      { key: "HAMD", label: "Hamd", emoji: "🌙" },
      { key: "DUA", label: "Dua", emoji: "🕋" },
      { key: "AZKAR", label: "Azkar", emoji: "📿" },
      { key: "DUROOD", label: "Durood", emoji: "❤️" },
      { key: "BAYAN", label: "Bayan / Nasihat", emoji: "🎙️" },
    ],
  };
}

export async function listSurahs() {
  const { rows } = await pool.query(
    "SELECT number, name_arabic, name_transliteration, name_english, ayat_count, revelation_place FROM quran_surahs ORDER BY number ASC"
  );
  return {
    surahs: rows.map((r) => ({
      number: r.number,
      nameArabic: r.name_arabic,
      nameTransliteration: r.name_transliteration,
      nameEnglish: r.name_english,
      ayatCount: r.ayat_count,
      revelationPlace: r.revelation_place,
    })),
  };
}
