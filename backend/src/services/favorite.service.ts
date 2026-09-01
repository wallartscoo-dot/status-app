import { pool, withTransaction } from "../config/db";
import { ApiError } from "../utils/ApiError";
import type { StatusRow } from "../types/db";

export async function addFavorite(userId: string, statusId: string) {
  const { rows: statusRows } = await pool.query<StatusRow>("SELECT * FROM statuses WHERE id = $1", [
    statusId,
  ]);
  const status = statusRows[0];
  if (!status) throw ApiError.notFound("Status not found");

  const { rows: existingRows } = await pool.query(
    "SELECT id FROM favorites WHERE user_id = $1 AND status_id = $2",
    [userId, statusId]
  );
  if (existingRows[0]) return { alreadyFavorited: true };

  await withTransaction(async (client) => {
    await client.query("INSERT INTO favorites (user_id, status_id) VALUES ($1, $2)", [
      userId,
      statusId,
    ]);
    await client.query("UPDATE statuses SET favorite_count = favorite_count + 1 WHERE id = $1", [
      statusId,
    ]);
    await client.query(
      "UPDATE profiles SET total_favorites = total_favorites + 1 WHERE user_id = $1",
      [userId]
    );
    await client.query(
      `INSERT INTO notifications (user_id, type, title, body)
       VALUES ($1, 'FAVORITE', $2, $3)`,
      [
        status.creator_id,
        "Someone added your status to favorites ❤️",
        `Your status "${status.title}" was just favorited.`,
      ]
    );
  });

  return { alreadyFavorited: false };
}

export async function removeFavorite(userId: string, statusId: string) {
  const { rows } = await pool.query("SELECT id FROM favorites WHERE user_id = $1 AND status_id = $2", [
    userId,
    statusId,
  ]);
  if (!rows[0]) throw ApiError.notFound("Favorite not found");

  await withTransaction(async (client) => {
    await client.query("DELETE FROM favorites WHERE user_id = $1 AND status_id = $2", [
      userId,
      statusId,
    ]);
    await client.query(
      "UPDATE statuses SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id = $1",
      [statusId]
    );
    await client.query(
      "UPDATE profiles SET total_favorites = GREATEST(total_favorites - 1, 0) WHERE user_id = $1",
      [userId]
    );
  });
}

interface FavoriteListRow {
  status_id: string;
  favorited_at: Date;
  title: string;
  type: string;
  media_url: string;
  thumbnail_url: string | null;
  duration_sec: number | null;
  category_key: string;
  category_label: string;
  category_emoji: string | null;
  creator_id: string;
  creator_username: string;
  creator_full_name: string;
}

export async function listFavorites(userId: string, params: { page: number; limit: number }) {
  const { page, limit } = params;
  const offset = (page - 1) * limit;

  const [{ rows: countRows }, { rows }] = await Promise.all([
    pool.query<{ count: string }>("SELECT COUNT(*) FROM favorites WHERE user_id = $1", [userId]),
    pool.query<FavoriteListRow>(
      `SELECT f.status_id, f.created_at AS favorited_at,
              s.title, s.type, s.media_url, s.thumbnail_url, s.duration_sec,
              c.key AS category_key, c.label AS category_label, c.emoji AS category_emoji,
              u.id AS creator_id, u.username AS creator_username, u.full_name AS creator_full_name
       FROM favorites f
       JOIN statuses s ON s.id = f.status_id
       JOIN categories c ON c.id = s.category_id
       JOIN users u ON u.id = s.creator_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
  ]);

  const total = Number(countRows[0].count);

  return {
    items: rows.map((f) => ({
      id: f.status_id,
      title: f.title,
      type: f.type,
      mediaUrl: f.media_url,
      thumbnailUrl: f.thumbnail_url,
      durationSec: f.duration_sec,
      category: { key: f.category_key, label: f.category_label, emoji: f.category_emoji },
      creator: { id: f.creator_id, username: f.creator_username, fullName: f.creator_full_name },
      favoritedAt: f.favorited_at,
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
