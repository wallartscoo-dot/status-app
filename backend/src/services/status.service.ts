import { pool, withTransaction } from "../config/db";
import { ApiError } from "../utils/ApiError";
import * as notificationService from "./notification.service";
import type { StatusType, StatusWithRelationsRow, ReportRow, ReportReason } from "../types/db";

// Shared SELECT that joins category + creator + aggregated hashtags into one
// row per status. Reused by every list/detail query below.
const BASE_SELECT = `
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
`;

/** Shapes a joined status row into the API's public status object. */
function toPublicStatus(status: StatusWithRelationsRow, viewerFavoriteIds?: Set<string>) {
  return {
    id: status.id,
    title: status.title,
    description: status.description,
    type: status.type,
    mediaUrl: status.media_url,
    thumbnailUrl: status.thumbnail_url,
    durationSec: status.duration_sec,
    viewCount: status.view_count,
    downloadCount: status.download_count,
    favoriteCount: status.favorite_count,
    isFeatured: status.is_featured,
    category: { key: status.category_key, label: status.category_label, emoji: status.category_emoji },
    creator: {
      id: status.creator_id,
      username: status.creator_username,
      fullName: status.creator_full_name,
      avatarUrl: status.creator_avatar_url,
    },
    hashtags: status.hashtags ?? [],
    isFavorited: viewerFavoriteIds ? viewerFavoriteIds.has(status.id) : undefined,
    createdAt: status.created_at,
  };
}

async function favoriteIdsFor(userId: string | undefined, statusIds: string[]): Promise<Set<string>> {
  if (!userId || statusIds.length === 0) return new Set();
  const { rows } = await pool.query<{ status_id: string }>(
    "SELECT status_id FROM favorites WHERE user_id = $1 AND status_id = ANY($2::uuid[])",
    [userId, statusIds]
  );
  return new Set(rows.map((r) => r.status_id));
}

function paginate(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export interface ListParams {
  page: number;
  limit: number;
  category?: string;
  type?: StatusType;
  viewerId?: string;
}

export async function listStatuses(params: ListParams) {
  const { page, limit, category, type, viewerId } = params;
  const offset = (page - 1) * limit;

  const conditions = ["s.visibility = 'PUBLISHED'"];
  const values: unknown[] = [];
  if (category) {
    values.push(category);
    conditions.push(`c.key = $${values.length}`);
  }
  if (type) {
    values.push(type);
    conditions.push(`s.type = $${values.length}`);
  }
  const where = conditions.join(" AND ");

  const countQuery = `SELECT COUNT(*) FROM statuses s JOIN categories c ON c.id = s.category_id WHERE ${where}`;
  const listQuery = `${BASE_SELECT} WHERE ${where} ORDER BY s.created_at DESC LIMIT $${
    values.length + 1
  } OFFSET $${values.length + 2}`;

  const [{ rows: countRows }, { rows: statusRows }] = await Promise.all([
    pool.query<{ count: string }>(countQuery, values),
    pool.query<StatusWithRelationsRow>(listQuery, [...values, limit, offset]),
  ]);

  const total = Number(countRows[0].count);
  const favIds = await favoriteIdsFor(viewerId, statusRows.map((s) => s.id));

  return { items: statusRows.map((s) => toPublicStatus(s, favIds)), ...paginate(page, limit, total) };
}

export async function trendingStatuses(params: {
  page: number;
  limit: number;
  windowDays: number;
  viewerId?: string;
}) {
  const { page, limit, windowDays, viewerId } = params;
  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(*) FROM statuses s
    WHERE s.visibility = 'PUBLISHED' AND s.created_at >= now() - ($1 || ' days')::interval`;
  const listQuery = `${BASE_SELECT}
    WHERE s.visibility = 'PUBLISHED' AND s.created_at >= now() - ($1 || ' days')::interval
    ORDER BY s.download_count DESC, s.favorite_count DESC, s.view_count DESC
    LIMIT $2 OFFSET $3`;

  const [{ rows: countRows }, { rows: statusRows }] = await Promise.all([
    pool.query<{ count: string }>(countQuery, [windowDays]),
    pool.query<StatusWithRelationsRow>(listQuery, [windowDays, limit, offset]),
  ]);

  const total = Number(countRows[0].count);
  const favIds = await favoriteIdsFor(viewerId, statusRows.map((s) => s.id));

  return { items: statusRows.map((s) => toPublicStatus(s, favIds)), ...paginate(page, limit, total) };
}

export async function getStatusById(id: string, viewerId?: string) {
  const { rows } = await pool.query<StatusWithRelationsRow>(`${BASE_SELECT} WHERE s.id = $1`, [id]);
  const status = rows[0];
  if (!status || status.visibility !== "PUBLISHED") {
    throw ApiError.notFound("Status not found");
  }

  // Fire-and-forget view increment (best-effort, doesn't block the response).
  pool.query("UPDATE statuses SET view_count = view_count + 1 WHERE id = $1", [id]).catch(() => {});

  const favIds = await favoriteIdsFor(viewerId, [status.id]);
  return toPublicStatus(status, favIds);
}

export async function statusesByCategory(
  categoryKey: string,
  params: { page: number; limit: number; viewerId?: string }
) {
  const { rows } = await pool.query("SELECT id FROM categories WHERE key = $1", [categoryKey]);
  if (!rows[0]) throw ApiError.notFound(`Category '${categoryKey}' not found`);

  return listStatuses({ ...params, category: categoryKey });
}

/**
 * Personalized "For You" feed (spec section 11): weights the user's most-
 * interacted-with categories (favorites + downloads) and surfaces fresh,
 * popular statuses from those categories, excluding ones already favorited.
 * Falls back to trending — for guests, brand-new accounts with no history
 * yet, or to top up a short personalized result to a full page.
 */
export async function recommendedStatuses(viewerId: string | undefined, limit: number) {
  if (!viewerId) {
    return trendingStatuses({ page: 1, limit, windowDays: 30, viewerId });
  }

  const { rows: categoryRows } = await pool.query<{ category_id: string }>(
    `SELECT category_id, COUNT(*) AS weight FROM (
       SELECT s.category_id FROM favorites f JOIN statuses s ON s.id = f.status_id WHERE f.user_id = $1
       UNION ALL
       SELECT s.category_id FROM downloads d JOIN statuses s ON s.id = d.status_id WHERE d.user_id = $1
     ) interactions
     GROUP BY category_id
     ORDER BY COUNT(*) DESC
     LIMIT 5`,
    [viewerId]
  );

  if (categoryRows.length === 0) {
    return trendingStatuses({ page: 1, limit, windowDays: 30, viewerId });
  }

  const categoryIds = categoryRows.map((r) => r.category_id);

  const { rows: statusRows } = await pool.query<StatusWithRelationsRow>(
    `${BASE_SELECT}
     WHERE s.visibility = 'PUBLISHED' AND s.category_id = ANY($1::uuid[])
       AND s.id NOT IN (SELECT status_id FROM favorites WHERE user_id = $2)
     ORDER BY s.download_count DESC, s.created_at DESC
     LIMIT $3`,
    [categoryIds, viewerId, limit]
  );

  const favIds = await favoriteIdsFor(viewerId, statusRows.map((s) => s.id));
  let items = statusRows.map((s) => toPublicStatus(s, favIds));

  // Always return a full page: top up with trending if personalization
  // didn't have enough fresh material in the user's favorite categories.
  if (items.length < limit) {
    const topUp = await trendingStatuses({ page: 1, limit: limit - items.length, windowDays: 30, viewerId });
    const seen = new Set(items.map((i) => i.id));
    items = [...items, ...topUp.items.filter((i) => !seen.has(i.id))];
  }

  return { items, page: 1, limit, total: items.length, totalPages: 1 };
}

export async function searchStatuses(params: { q: string; page: number; limit: number; viewerId?: string }) {
  const { q, page, limit, viewerId } = params;
  const offset = (page - 1) * limit;
  const like = `%${q.toLowerCase()}%`;
  const tagLike = `%${q.toLowerCase().replace(/^#/, "")}%`;

  const where = `
    s.visibility = 'PUBLISHED' AND (
      lower(s.title) LIKE $1
      OR lower(s.description) LIKE $1
      OR lower(c.label) LIKE $1
      OR lower(u.username) LIKE $1
      OR EXISTS (
        SELECT 1 FROM status_hashtags sh JOIN hashtags h ON h.id = sh.hashtag_id
        WHERE sh.status_id = s.id AND lower(h.tag) LIKE $2
      )
    )`;

  const countQuery = `
    SELECT COUNT(*) FROM statuses s
    JOIN categories c ON c.id = s.category_id
    JOIN users u ON u.id = s.creator_id
    WHERE ${where}`;
  const listQuery = `${BASE_SELECT} WHERE ${where} ORDER BY s.download_count DESC LIMIT $3 OFFSET $4`;

  const [{ rows: countRows }, { rows: statusRows }] = await Promise.all([
    pool.query<{ count: string }>(countQuery, [like, tagLike]),
    pool.query<StatusWithRelationsRow>(listQuery, [like, tagLike, limit, offset]),
  ]);

  const total = Number(countRows[0].count);
  const favIds = await favoriteIdsFor(viewerId, statusRows.map((s) => s.id));

  return {
    items: statusRows.map((s) => toPublicStatus(s, favIds)),
    ...paginate(page, limit, total),
    query: q,
  };
}

export interface CreateStatusInput {
  title: string;
  description?: string;
  type: StatusType;
  mediaUrl: string;
  thumbnailUrl?: string;
  durationSec?: number;
  fileSize?: number;
  mimeType?: string;
  categoryKey: string;
  hashtags: string[];
}

export async function createStatus(creatorId: string, input: CreateStatusInput) {
  const { rows: categoryRows } = await pool.query<{ id: string }>(
    "SELECT id FROM categories WHERE key = $1",
    [input.categoryKey]
  );
  const category = categoryRows[0];
  if (!category) throw ApiError.badRequest(`Unknown category '${input.categoryKey}'`);

  const statusId = await withTransaction(async (client) => {
    const { rows: createdRows } = await client.query<{ id: string }>(
      `INSERT INTO statuses
         (title, description, type, media_url, thumbnail_url, duration_sec, file_size, mime_type, creator_id, category_id, visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PUBLISHED')
       RETURNING id`,
      [
        input.title,
        input.description ?? null,
        input.type,
        input.mediaUrl,
        input.thumbnailUrl ?? null,
        input.durationSec ?? null,
        input.fileSize ?? null,
        input.mimeType ?? null,
        creatorId,
        category.id,
      ]
    );
    const created = createdRows[0];

    for (const rawTag of input.hashtags) {
      const tag = rawTag.replace(/^#/, "").toLowerCase();
      if (!tag) continue;
      const { rows: hashtagRows } = await client.query<{ id: string }>(
        `INSERT INTO hashtags (tag) VALUES ($1)
         ON CONFLICT (tag) DO UPDATE SET tag = EXCLUDED.tag
         RETURNING id`,
        [tag]
      );
      await client.query(
        "INSERT INTO status_hashtags (status_id, hashtag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [created.id, hashtagRows[0].id]
      );
    }

    await client.query(
      "UPDATE profiles SET total_uploads = total_uploads + 1 WHERE user_id = $1",
      [creatorId]
    );

    return created.id;
  });

  // Best-effort fan-out to followers (spec section 16: "New status from a
  // creator you follow.") — never blocks or fails the publish itself.
  const { rows: creatorRows } = await pool.query<{ username: string }>(
    "SELECT username FROM users WHERE id = $1",
    [creatorId]
  );
  const creatorUsername = creatorRows[0]?.username ?? "Someone you follow";
  notificationService
    .notifyFollowers(creatorId, "New status from a creator you follow", `@${creatorUsername} just posted "${input.title}"`)
    .catch(() => {});

  return getStatusById(statusId, creatorId);
}

export async function reportStatus(
  statusId: string,
  reporterId: string,
  input: { reason: ReportReason; details?: string }
) {
  const { rows: statusRows } = await pool.query("SELECT id FROM statuses WHERE id = $1", [statusId]);
  if (!statusRows[0]) throw ApiError.notFound("Status not found");

  const { rows } = await pool.query<ReportRow>(
    `INSERT INTO reports (status_id, reporter_id, reason, details)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [statusId, reporterId, input.reason, input.details ?? null]
  );
  const report = rows[0];

  return { id: report.id, state: report.state, createdAt: report.created_at };
}
