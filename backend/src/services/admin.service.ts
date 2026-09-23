import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import * as analyticsService from "./analytics.service";

function paginate(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

// ---------------------------------------------------------------------------
// Analytics (spec section 17)
// ---------------------------------------------------------------------------

export async function getAnalytics() {
  const [
    totalUsers,
    activeUsers,
    totalStatuses,
    totalDownloads,
    totalFavorites,
    openReports,
    trending,
    events,
  ] = await Promise.all([
    pool.query<{ count: string }>("SELECT COUNT(*) FROM users"),
    // "Active" = created at least one download/favorite/status in the last 30 days.
    pool.query<{ count: string }>(`
      SELECT COUNT(DISTINCT user_id) FROM (
        SELECT user_id, created_at FROM downloads
        UNION ALL SELECT user_id, created_at FROM favorites
      ) activity
      WHERE created_at >= now() - interval '30 days'
    `),
    pool.query<{ count: string }>("SELECT COUNT(*) FROM statuses WHERE visibility = 'PUBLISHED'"),
    pool.query<{ count: string }>("SELECT COUNT(*) FROM downloads"),
    pool.query<{ count: string }>("SELECT COUNT(*) FROM favorites"),
    pool.query<{ count: string }>("SELECT COUNT(*) FROM reports WHERE state = 'OPEN'"),
    pool.query(`
      SELECT s.id, s.title, s.download_count, s.view_count, u.username AS creator_username
      FROM statuses s JOIN users u ON u.id = s.creator_id
      WHERE s.visibility = 'PUBLISHED'
      ORDER BY s.download_count DESC LIMIT 5
    `),
    analyticsService.eventSummary(7),
  ]);

  return {
    totalUsers: Number(totalUsers.rows[0].count),
    activeUsers: Number(activeUsers.rows[0].count),
    totalStatuses: Number(totalStatuses.rows[0].count),
    totalDownloads: Number(totalDownloads.rows[0].count),
    totalFavorites: Number(totalFavorites.rows[0].count),
    openReports: Number(openReports.rows[0].count),
    trendingContent: trending.rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      downloadCount: r.download_count,
      viewCount: r.view_count,
      creatorUsername: r.creator_username,
    })),
    // Last 7 days of client-tracked events (screen views, publishes,
    // downloads, favorites, shares, follows, searches) — see
    // src/services/analytics.service.ts.
    eventSummary7d: events,
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function listUsers(params: { page: number; limit: number; search?: string }) {
  const { page, limit, search } = params;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: unknown[] = [];
  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    conditions.push(`(lower(u.username) LIKE $${values.length} OR lower(u.email) LIKE $${values.length} OR lower(u.full_name) LIKE $${values.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countQuery = `SELECT COUNT(*) FROM users u ${where}`;
  const listQuery = `
    SELECT u.id, u.full_name, u.username, u.email, u.role, u.is_banned, u.is_creator, u.created_at,
           p.total_uploads, p.total_downloads, p.total_favorites, p.follower_count
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    ${where}
    ORDER BY u.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

  const [{ rows: countRows }, { rows }] = await Promise.all([
    pool.query<{ count: string }>(countQuery, values),
    pool.query(listQuery, [...values, limit, offset]),
  ]);

  const total = Number(countRows[0].count);
  return {
    items: rows.map((u: any) => ({
      id: u.id,
      fullName: u.full_name,
      username: u.username,
      email: u.email,
      role: u.role,
      isBanned: u.is_banned,
      isCreator: u.is_creator,
      joinedAt: u.created_at,
      totalUploads: u.total_uploads ?? 0,
      totalDownloads: u.total_downloads ?? 0,
      totalFavorites: u.total_favorites ?? 0,
      followerCount: u.follower_count ?? 0,
    })),
    ...paginate(page, limit, total),
  };
}

export async function setUserBanned(userId: string, banned: boolean) {
  const { rows } = await pool.query(
    "UPDATE users SET is_banned = $1 WHERE id = $2 RETURNING id, username, is_banned",
    [banned, userId]
  );
  if (!rows[0]) throw ApiError.notFound("User not found");
  return { id: rows[0].id, username: rows[0].username, isBanned: rows[0].is_banned };
}

// ---------------------------------------------------------------------------
// Content moderation
// ---------------------------------------------------------------------------

export async function listStatusesForAdmin(params: { page: number; limit: number; visibility?: string }) {
  const { page, limit, visibility } = params;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: unknown[] = [];
  if (visibility) {
    values.push(visibility);
    conditions.push(`s.visibility = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countQuery = `SELECT COUNT(*) FROM statuses s ${where}`;
  const listQuery = `
    SELECT s.id, s.title, s.type, s.media_url, s.thumbnail_url, s.visibility, s.is_featured,
           s.view_count, s.download_count, s.favorite_count, s.created_at,
           c.label AS category_label, u.username AS creator_username
    FROM statuses s
    JOIN categories c ON c.id = s.category_id
    JOIN users u ON u.id = s.creator_id
    ${where}
    ORDER BY s.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

  const [{ rows: countRows }, { rows }] = await Promise.all([
    pool.query<{ count: string }>(countQuery, values),
    pool.query(listQuery, [...values, limit, offset]),
  ]);

  const total = Number(countRows[0].count);
  return {
    items: rows.map((s: any) => ({
      id: s.id,
      title: s.title,
      type: s.type,
      mediaUrl: s.media_url,
      thumbnailUrl: s.thumbnail_url,
      visibility: s.visibility,
      isFeatured: s.is_featured,
      viewCount: s.view_count,
      downloadCount: s.download_count,
      favoriteCount: s.favorite_count,
      category: s.category_label,
      creatorUsername: s.creator_username,
      createdAt: s.created_at,
    })),
    ...paginate(page, limit, total),
  };
}

export async function moderateStatus(
  statusId: string,
  patch: { visibility?: string; isFeatured?: boolean }
) {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.visibility !== undefined) {
    values.push(patch.visibility);
    sets.push(`visibility = $${values.length}`);
  }
  if (patch.isFeatured !== undefined) {
    values.push(patch.isFeatured);
    sets.push(`is_featured = $${values.length}`);
  }
  values.push(statusId);

  const { rows } = await pool.query(
    `UPDATE statuses SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING id, visibility, is_featured`,
    values
  );
  if (!rows[0]) throw ApiError.notFound("Status not found");
  return { id: rows[0].id, visibility: rows[0].visibility, isFeatured: rows[0].is_featured };
}

export async function deleteStatus(statusId: string) {
  const { rowCount } = await pool.query("DELETE FROM statuses WHERE id = $1", [statusId]);
  if (!rowCount) throw ApiError.notFound("Status not found");
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function listReports(params: { page: number; limit: number; state?: string }) {
  const { page, limit, state } = params;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: unknown[] = [];
  if (state) {
    values.push(state);
    conditions.push(`r.state = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countQuery = `SELECT COUNT(*) FROM reports r ${where}`;
  const listQuery = `
    SELECT r.id, r.reason, r.details, r.state, r.created_at,
           s.id AS status_id, s.title AS status_title, s.visibility AS status_visibility,
           reporter.username AS reporter_username
    FROM reports r
    JOIN statuses s ON s.id = r.status_id
    JOIN users reporter ON reporter.id = r.reporter_id
    ${where}
    ORDER BY r.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

  const [{ rows: countRows }, { rows }] = await Promise.all([
    pool.query<{ count: string }>(countQuery, values),
    pool.query(listQuery, [...values, limit, offset]),
  ]);

  const total = Number(countRows[0].count);
  return {
    items: rows.map((r: any) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      state: r.state,
      createdAt: r.created_at,
      status: { id: r.status_id, title: r.status_title, visibility: r.status_visibility },
      reporterUsername: r.reporter_username,
    })),
    ...paginate(page, limit, total),
  };
}

export async function updateReportState(reportId: string, state: string) {
  const { rows } = await pool.query(
    "UPDATE reports SET state = $1 WHERE id = $2 RETURNING id, state",
    [state, reportId]
  );
  if (!rows[0]) throw ApiError.notFound("Report not found");
  return { id: rows[0].id, state: rows[0].state };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function listCategoriesForAdmin() {
  const { rows } = await pool.query(`
    SELECT c.id, c.key, c.label, c.emoji, c.sort_order,
           (SELECT COUNT(*) FROM statuses s WHERE s.category_id = c.id) AS status_count
    FROM categories c
    ORDER BY c.sort_order ASC, c.label ASC
  `);
  return rows.map((c: any) => ({
    id: c.id,
    key: c.key,
    label: c.label,
    emoji: c.emoji,
    sortOrder: c.sort_order,
    statusCount: Number(c.status_count),
  }));
}

export async function createCategory(input: { key: string; label: string; emoji?: string; sortOrder: number }) {
  const { rows } = await pool.query(
    `INSERT INTO categories (key, label, emoji, sort_order) VALUES ($1, $2, $3, $4)
     ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label
     RETURNING id, key, label, emoji, sort_order`,
    [input.key, input.label, input.emoji ?? null, input.sortOrder]
  );
  const c = rows[0];
  return { id: c.id, key: c.key, label: c.label, emoji: c.emoji, sortOrder: c.sort_order };
}

export async function updateCategory(
  categoryId: string,
  patch: { label?: string; emoji?: string; sortOrder?: number }
) {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.label !== undefined) {
    values.push(patch.label);
    sets.push(`label = $${values.length}`);
  }
  if (patch.emoji !== undefined) {
    values.push(patch.emoji);
    sets.push(`emoji = $${values.length}`);
  }
  if (patch.sortOrder !== undefined) {
    values.push(patch.sortOrder);
    sets.push(`sort_order = $${values.length}`);
  }
  if (sets.length === 0) throw ApiError.badRequest("No fields to update");
  values.push(categoryId);

  const { rows } = await pool.query(
    `UPDATE categories SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING id, key, label, emoji, sort_order`,
    values
  );
  if (!rows[0]) throw ApiError.notFound("Category not found");
  const c = rows[0];
  return { id: c.id, key: c.key, label: c.label, emoji: c.emoji, sortOrder: c.sort_order };
}
