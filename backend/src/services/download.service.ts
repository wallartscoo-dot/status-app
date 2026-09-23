import { pool, withTransaction } from "../config/db";
import { ApiError } from "../utils/ApiError";
import * as notificationService from "./notification.service";
import type { StatusWithRelationsRow } from "../types/db";

function paginate(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

// Thresholds at which a creator gets a "your status is getting popular"
// notification (spec section 16). Deliberately coarse and one-shot per
// threshold (checked via exact equality below) so a single busy status
// doesn't spam its creator with a notification per download.
const TRENDING_THRESHOLDS = [10, 50, 100, 500, 1000];

/**
 * Records a download and bumps both the status's public download_count and
 * the user's profile total_downloads. Real media transcoding/processing
 * doesn't exist yet, so the state goes straight to COMPLETED — the shape
 * (PENDING/PROCESSING/COMPLETED/FAILED from spec section 7) is already in
 * the schema for whenever that pipeline is added.
 *
 * Idempotent-ish by design choice: re-downloading the same status is allowed
 * (unlike favorites) since "download again" is a normal, expected action —
 * but we still return the existing row's info rather than erroring.
 */
export async function recordDownload(userId: string, statusId: string) {
  const { rows: statusRows } = await pool.query<StatusWithRelationsRow>(
    "SELECT id, media_url, title, creator_id, download_count FROM statuses WHERE id = $1 AND visibility = 'PUBLISHED'",
    [statusId]
  );
  const status = statusRows[0];
  if (!status) throw ApiError.notFound("Status not found");

  const download = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO downloads (user_id, status_id, state) VALUES ($1, $2, 'COMPLETED') RETURNING *`,
      [userId, statusId]
    );
    await client.query("UPDATE statuses SET download_count = download_count + 1 WHERE id = $1", [statusId]);
    await client.query(
      "UPDATE profiles SET total_downloads = total_downloads + 1 WHERE user_id = $1",
      [userId]
    );
    return rows[0];
  });

  // Best-effort "getting popular" notification when a threshold is crossed
  // exactly (avoids re-notifying on every subsequent download past it).
  const newCount = status.download_count + 1;
  if (TRENDING_THRESHOLDS.includes(newCount)) {
    notificationService
      .notify(
        status.creator_id,
        "TRENDING",
        "Your status is getting popular 🔥",
        `"${status.title}" just passed ${newCount} downloads.`
      )
      .catch(() => {});
  }

  return {
    id: download.id,
    statusId,
    state: download.state as "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED",
    mediaUrl: status.media_url,
    createdAt: download.created_at,
  };
}

export async function listDownloads(userId: string, page: number, limit: number) {
  const offset = (page - 1) * limit;

  const countQuery = "SELECT COUNT(*) FROM downloads WHERE user_id = $1";
  const listQuery = `
    SELECT d.id AS download_id, d.state, d.created_at AS downloaded_at,
           s.id, s.title, s.type, s.media_url, s.thumbnail_url, s.duration_sec,
           c.key AS category_key, c.label AS category_label, c.emoji AS category_emoji,
           u.username AS creator_username, u.full_name AS creator_full_name
    FROM downloads d
    JOIN statuses s ON s.id = d.status_id
    JOIN categories c ON c.id = s.category_id
    JOIN users u ON u.id = s.creator_id
    WHERE d.user_id = $1
    ORDER BY d.created_at DESC
    LIMIT $2 OFFSET $3`;

  const [{ rows: countRows }, { rows }] = await Promise.all([
    pool.query<{ count: string }>(countQuery, [userId]),
    pool.query(listQuery, [userId, limit, offset]),
  ]);

  const total = Number(countRows[0].count);

  const items = rows.map((r: any) => ({
    downloadId: r.download_id,
    state: r.state,
    downloadedAt: r.downloaded_at,
    status: {
      id: r.id,
      title: r.title,
      type: r.type,
      mediaUrl: r.media_url,
      thumbnailUrl: r.thumbnail_url,
      durationSec: r.duration_sec,
      category: { key: r.category_key, label: r.category_label, emoji: r.category_emoji },
      creator: { username: r.creator_username, fullName: r.creator_full_name },
    },
  }));

  return { items, ...paginate(page, limit, total) };
}
