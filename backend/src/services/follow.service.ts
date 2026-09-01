import { pool, withTransaction } from "../config/db";
import { ApiError } from "../utils/ApiError";
import type { StatusWithRelationsRow } from "../types/db";

function paginate(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { rows } = await pool.query(
    "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
    [followerId, followingId]
  );
  return rows.length > 0;
}

export async function follow(followerId: string, followingId: string) {
  if (followerId === followingId) throw ApiError.badRequest("You can't follow yourself");

  const { rows: targetRows } = await pool.query("SELECT id FROM users WHERE id = $1", [followingId]);
  if (!targetRows[0]) throw ApiError.notFound("User not found");

  const already = await isFollowing(followerId, followingId);
  if (already) return { alreadyFollowing: true };

  await withTransaction(async (client) => {
    await client.query(
      "INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [followerId, followingId]
    );
    await client.query(
      "UPDATE profiles SET follower_count = follower_count + 1 WHERE user_id = $1",
      [followingId]
    );
  });

  return { alreadyFollowing: false };
}

export async function unfollow(followerId: string, followingId: string) {
  const already = await isFollowing(followerId, followingId);
  if (!already) return;

  await withTransaction(async (client) => {
    await client.query("DELETE FROM follows WHERE follower_id = $1 AND following_id = $2", [
      followerId,
      followingId,
    ]);
    await client.query(
      "UPDATE profiles SET follower_count = GREATEST(follower_count - 1, 0) WHERE user_id = $1",
      [followingId]
    );
  });
}

/** Statuses from creators the user follows — the "Following" feed (spec section 15). */
export async function followingFeed(userId: string, page: number, limit: number) {
  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(*) FROM statuses s
    WHERE s.visibility = 'PUBLISHED'
      AND s.creator_id IN (SELECT following_id FROM follows WHERE follower_id = $1)`;
  const listQuery = `
    SELECT s.*,
           c.key AS category_key, c.label AS category_label, c.emoji AS category_emoji,
           u.username AS creator_username, u.full_name AS creator_full_name,
           p.avatar_url AS creator_avatar_url,
           COALESCE(
             (SELECT array_agg(h.tag ORDER BY h.tag)
              FROM status_hashtags sh JOIN hashtags h ON h.id = sh.hashtag_id
              WHERE sh.status_id = s.id),
             '{}'
           ) AS hashtags
    FROM statuses s
    JOIN categories c ON c.id = s.category_id
    JOIN users u ON u.id = s.creator_id
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE s.visibility = 'PUBLISHED'
      AND s.creator_id IN (SELECT following_id FROM follows WHERE follower_id = $1)
    ORDER BY s.created_at DESC
    LIMIT $2 OFFSET $3`;

  const [{ rows: countRows }, { rows: statusRows }] = await Promise.all([
    pool.query<{ count: string }>(countQuery, [userId]),
    pool.query<StatusWithRelationsRow>(listQuery, [userId, limit, offset]),
  ]);

  const { rows: favRows } = await pool.query<{ status_id: string }>(
    "SELECT status_id FROM favorites WHERE user_id = $1 AND status_id = ANY($2::uuid[])",
    [userId, statusRows.map((s) => s.id)]
  );
  const favIds = new Set(favRows.map((r) => r.status_id));

  const items = statusRows.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    type: s.type,
    mediaUrl: s.media_url,
    thumbnailUrl: s.thumbnail_url,
    durationSec: s.duration_sec,
    viewCount: s.view_count,
    downloadCount: s.download_count,
    favoriteCount: s.favorite_count,
    isFeatured: s.is_featured,
    category: { key: s.category_key, label: s.category_label, emoji: s.category_emoji },
    creator: {
      id: s.creator_id,
      username: s.creator_username,
      fullName: s.creator_full_name,
      avatarUrl: s.creator_avatar_url,
    },
    hashtags: s.hashtags ?? [],
    isFavorited: favIds.has(s.id),
    createdAt: s.created_at,
  }));

  const total = Number(countRows[0].count);
  return { items, ...paginate(page, limit, total) };
}
