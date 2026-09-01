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
