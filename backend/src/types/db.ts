export interface UserRow {
  id: string;
  full_name: string;
  username: string;
  email: string;
  password_hash: string;
  role: "USER" | "ADMIN";
  is_banned: boolean;
  is_creator: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProfileRow {
  id: string;
  user_id: string;
  avatar_url: string | null;
  bio: string | null;
  total_downloads: number;
  total_favorites: number;
  total_uploads: number;
  follower_count: number;
  notification_prefs: NotificationPrefs;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationPrefs {
  favorites: boolean;
  newFromCreator: boolean;
  trending: boolean;
  system: boolean;
}

export interface CategoryRow {
  id: string;
  key: string;
  label: string;
  emoji: string | null;
  icon_url: string | null;
  sort_order: number;
  created_at: Date;
}

export type StatusType = "VIDEO" | "IMAGE" | "QUOTE";
export type StatusVisibility = "PENDING" | "PUBLISHED" | "REJECTED" | "REMOVED";

export interface StatusRow {
  id: string;
  title: string;
  description: string | null;
  type: StatusType;
  media_url: string;
  thumbnail_url: string | null;
  duration_sec: number | null;
  file_size: number | null;
  mime_type: string | null;
  view_count: number;
  download_count: number;
  favorite_count: number;
  visibility: StatusVisibility;
  is_featured: boolean;
  creator_id: string;
  category_id: string;
  created_at: Date;
  updated_at: Date;
}

/** Flattened row returned by the joined status list/detail queries. */
export interface StatusWithRelationsRow extends StatusRow {
  category_key: string;
  category_label: string;
  category_emoji: string | null;
  creator_username: string;
  creator_full_name: string;
  creator_avatar_url: string | null;
  hashtags: string[] | null; // aggregated via array_agg
  sound_id?: string | null;
  sound_start_sec?: string | null;
  sound_end_sec?: string | null;
  sound_volume?: string | null;
  original_volume?: string | null;
}

// ---------------------------------------------------------------------------
// Sound Library
// ---------------------------------------------------------------------------

export type SoundCategory = "MUSIC" | "ISLAMIC";
export type IslamicSubcategory = "QURAN" | "NAAT" | "HAMD" | "DUA" | "AZKAR" | "DUROOD" | "BAYAN";
export type SoundSource = "LICENSED" | "ROYALTY_FREE" | "PUBLIC_DOMAIN" | "USER_UPLOADED";

export interface SoundRow {
  id: string;
  title: string;
  subtitle: string | null;
  category: SoundCategory;
  islamic_subcategory: IslamicSubcategory | null;
  genre_id: string | null;
  mood_id: string | null;
  artist_id: string | null;
  surah_id: string | null;
  ayat_start: number | null;
  ayat_end: number | null;
  artwork_url: string | null;
  audio_url: string;
  duration_sec: number;
  allow_trim: boolean;
  min_trim_sec: number;
  max_trim_sec: number;
  usage_count: number;
  favorite_count: number;
  status: "ACTIVE" | "HIDDEN";
  source: SoundSource;
  license_note: string | null;
  attribution: string | null;
  uploader_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Flattened row returned by sound.service's BASE_SELECT (joins artist/genre/mood/surah). */
export interface SoundWithRelationsRow extends SoundRow {
  genre_key: string | null;
  genre_label: string | null;
  mood_key: string | null;
  mood_label: string | null;
  mood_emoji: string | null;
  artist_name: string | null;
  artist_role: "ARTIST" | "RECITER" | null;
  artist_avatar_url: string | null;
  surah_number: number | null;
  surah_name_arabic: string | null;
  surah_name_transliteration: string | null;
  surah_name_english: string | null;
}

export interface QuranSurahRow {
  id: string;
  number: number;
  name_arabic: string;
  name_transliteration: string;
  name_english: string;
  ayat_count: number;
  revelation_place: "MECCA" | "MEDINA";
}

// ---------------------------------------------------------------------------
// Direct Messages
// ---------------------------------------------------------------------------

export interface ConversationRow {
  id: string;
  user_one_id: string;
  user_two_id: string;
  last_message_at: Date | null;
  created_at: Date;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: Date;
}

/** Conversation row joined with the *other* participant's info + last message + unread count. */
export interface ConversationWithRelationsRow extends ConversationRow {
  other_user_id: string;
  other_username: string;
  other_full_name: string;
  other_avatar_url: string | null;
  last_message_body: string | null;
  last_message_sender_id: string | null;
  unread_count: string; // COUNT(*) comes back as text from pg
}

export type ReportReason =
  | "COPYRIGHT"
  | "SPAM"
  | "OFFENSIVE"
  | "VIOLENCE"
  | "SEXUAL_CONTENT"
  | "HARASSMENT"
  | "OTHER";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: "WELCOME" | "TRENDING" | "FAVORITE" | "NEW_FROM_CREATOR" | "SYSTEM";
  title: string;
  body: string;
  is_read: boolean;
  created_at: Date;
}

export interface ReportRow {
  id: string;
  status_id: string;
  reporter_id: string;
  reason: ReportReason;
  details: string | null;
  state: "OPEN" | "REVIEWED" | "DISMISSED";
  created_at: Date;
}
