import { pool, withTransaction } from "../config/db";
import { ApiError } from "../utils/ApiError";
import type { SoundRow } from "../types/db";
import { getSoundById } from "./sound.service";

export async function addSoundFavorite(userId: string, soundId: string) {
  const { rows: soundRows } = await pool.query<SoundRow>("SELECT * FROM sounds WHERE id = $1", [soundId]);
  if (!soundRows[0] || soundRows[0].status !== "ACTIVE") throw ApiError.notFound("Sound not found");

  const { rows: existingRows } = await pool.query(
    "SELECT id FROM sound_favorites WHERE user_id = $1 AND sound_id = $2",
    [userId, soundId]
  );
  if (existingRows[0]) return { alreadyFavorited: true };

  await withTransaction(async (client) => {
    await client.query("INSERT INTO sound_favorites (user_id, sound_id) VALUES ($1, $2)", [userId, soundId]);
    await client.query("UPDATE sounds SET favorite_count = favorite_count + 1 WHERE id = $1", [soundId]);
  });

  return { alreadyFavorited: false };
}

export async function removeSoundFavorite(userId: string, soundId: string) {
  const { rows } = await pool.query("SELECT id FROM sound_favorites WHERE user_id = $1 AND sound_id = $2", [
    userId,
    soundId,
  ]);
  if (!rows[0]) throw ApiError.notFound("Favorite not found");

  await withTransaction(async (client) => {
    await client.query("DELETE FROM sound_favorites WHERE user_id = $1 AND sound_id = $2", [userId, soundId]);
    await client.query("UPDATE sounds SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id = $1", [
      soundId,
    ]);
  });
}

export async function listSoundFavorites(userId: string, params: { page: number; limit: number }) {
  const { page, limit } = params;
  const offset = (page - 1) * limit;

  const [{ rows: countRows }, { rows: idRows }] = await Promise.all([
    pool.query<{ count: string }>("SELECT COUNT(*) FROM sound_favorites WHERE user_id = $1", [userId]),
    pool.query<{ sound_id: string }>(
      `SELECT sound_id FROM sound_favorites WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
  ]);

  const total = Number(countRows[0].count);
  const items = await Promise.all(idRows.map((r) => getSoundById(r.sound_id, userId)));

  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
