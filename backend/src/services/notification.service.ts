import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import type { NotificationRow, NotificationPrefs } from "../types/db";

function paginate(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

function toPublic(n: NotificationRow) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    isRead: n.is_read,
    createdAt: n.created_at,
  };
}

export async function listNotifications(userId: string, page: number, limit: number) {
  const offset = (page - 1) * limit;
  const [{ rows: countRows }, { rows }, { rows: unreadRows }] = await Promise.all([
    pool.query<{ count: string }>("SELECT COUNT(*) FROM notifications WHERE user_id = $1", [userId]),
    pool.query<NotificationRow>(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [userId, limit, offset]
    ),
    pool.query<{ count: string }>(
      "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
      [userId]
    ),
  ]);

  const total = Number(countRows[0].count);
  return {
    items: rows.map(toPublic),
    unreadCount: Number(unreadRows[0].count),
    ...paginate(page, limit, total),
  };
}

export async function markRead(userId: string, notificationId: string) {
  const { rows } = await pool.query<NotificationRow>(
    "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *",
    [notificationId, userId]
  );
  if (!rows[0]) throw ApiError.notFound("Notification not found");
  return toPublic(rows[0]);
}

export async function markAllRead(userId: string) {
  await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE", [
    userId,
  ]);
}

// --- Preference-aware creation helpers, called from other services ---

async function prefsFor(userId: string): Promise<NotificationPrefs> {
  const { rows } = await pool.query<{ notification_prefs: NotificationPrefs }>(
    "SELECT notification_prefs FROM profiles WHERE user_id = $1",
    [userId]
  );
  return (
    rows[0]?.notification_prefs ?? {
      favorites: true,
      newFromCreator: true,
      trending: true,
      system: true,
    }
  );
}

async function create(
  userId: string,
  type: "WELCOME" | "TRENDING" | "FAVORITE" | "NEW_FROM_CREATOR" | "SYSTEM",
  title: string,
  body: string
) {
  await pool.query(
    "INSERT INTO notifications (user_id, type, title, body) VALUES ($1, $2, $3, $4)",
    [userId, type, title, body]
  );
}

/** Respects the recipient's notification preferences (spec section 16). WELCOME always sends. */
export async function notify(
  userId: string,
  type: "WELCOME" | "TRENDING" | "FAVORITE" | "NEW_FROM_CREATOR" | "SYSTEM",
  title: string,
  body: string
) {
  if (type === "WELCOME") return create(userId, type, title, body);
  const prefs = await prefsFor(userId);
  const prefKey =
    type === "FAVORITE" ? "favorites" : type === "NEW_FROM_CREATOR" ? "newFromCreator" : type === "TRENDING" ? "trending" : "system";
  if (!prefs[prefKey as keyof NotificationPrefs]) return; // muted by the recipient
  return create(userId, type, title, body);
}

/** Fans a notification out to every follower of `creatorId` — used when a followed creator publishes. */
export async function notifyFollowers(creatorId: string, title: string, body: string) {
  const { rows } = await pool.query<{ follower_id: string }>(
    "SELECT follower_id FROM follows WHERE following_id = $1",
    [creatorId]
  );
  await Promise.all(rows.map((r) => notify(r.follower_id, "NEW_FROM_CREATOR", title, body)));
}
