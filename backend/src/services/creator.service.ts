import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { isFollowing } from "./follow.service";
import type { StatusWithRelationsRow, UserRow, ProfileRow } from "../types/db";

const BASE_SELECT = `
  SELECT s.*,
         c.key AS category_key, c.label AS category_label, c.emoji AS category_emoji,
         u.username AS creator_username, u.full_name AS creator_full_name,
         p.avatar_url AS creator_avatar_url,
         '{}'::text[] AS hashtags
  FROM statuses s
  JOIN categories c ON c.id = s.category_id
  JOIN users u ON u.id = s.creator_id
  LEFT JOIN profiles p ON p.user_id = u.id
`;

function toPublicStatus(s: StatusWithRelationsRow) {
  return {
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
    createdAt: s.created_at,
  };
}

export async function getCreatorProfile(username: string, viewerId?: string) {
  const { rows: userRows } = await pool.query<UserRow>(
    "SELECT * FROM users WHERE username = $1 AND is_banned = FALSE",
    [username]
  );
  const user = userRows[0];
  if (!user) throw ApiError.notFound("Creator not found");

  const { rows: profileRows } = await pool.query<ProfileRow>(
    "SELECT * FROM profiles WHERE user_id = $1",
    [user.id]
  );
  const profile = profileRows[0] ?? null;

  const { rows: countRows } = await pool.query<{ count: string }>(
    "SELECT COUNT(*) FROM statuses WHERE creator_id = $1 AND visibility = 'PUBLISHED'",
    [user.id]
  );
  const { rows: followingCountRows } = await pool.query<{ count: string }>(
    "SELECT COUNT(*) FROM follows WHERE follower_id = $1",
    [user.id]
  );

  const { rows: popularRows } = await pool.query<StatusWithRelationsRow>(
    `${BASE_SELECT} WHERE s.creator_id = $1 AND s.visibility = 'PUBLISHED'
     ORDER BY s.download_count DESC, s.view_count DESC LIMIT 12`,
    [user.id]
  );

  const viewerIsFollowing =
    viewerId && viewerId !== user.id ? await isFollowing(viewerId, user.id) : false;

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    isCreator: user.is_creator,
    avatarUrl: profile?.avatar_url ?? null,
    bio: profile?.bio ?? null,
    followerCount: profile?.follower_count ?? 0,
    followingCount: Number(followingCountRows[0].count),
    totalUploads: Number(countRows[0].count),
    totalDownloads: profile?.total_downloads ?? 0,
    isFollowing: viewerIsFollowing,
    joinedAt: user.created_at,
    popularStatuses: popularRows.map(toPublicStatus),
  };
}
