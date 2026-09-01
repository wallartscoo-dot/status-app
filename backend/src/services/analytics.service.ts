import { pool } from "../config/db";

// Bounded allow-list rather than free-text event types: keeps the events
// table meaningful for the admin summary query below instead of silently
// accumulating typos and one-off client bugs as distinct "event types".
export const ANALYTICS_EVENT_TYPES = [
  "screen_view",
  "signup_completed",
  "login_completed",
  "status_published",
  "status_downloaded",
  "status_favorited",
  "status_unfavorited",
  "status_shared",
  "creator_followed",
  "search_performed",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export async function recordEvent(
  userId: string | undefined,
  eventType: AnalyticsEventType,
  metadata: Record<string, unknown> = {}
) {
  await pool.query(
    "INSERT INTO analytics_events (user_id, event_type, metadata) VALUES ($1, $2, $3)",
    [userId ?? null, eventType, JSON.stringify(metadata)]
  );
}

/** Event counts by type over the last N days — feeds the admin Overview tab. */
export async function eventSummary(days = 7) {
  const { rows } = await pool.query<{ event_type: string; count: string }>(
    `SELECT event_type, COUNT(*) AS count
     FROM analytics_events
     WHERE created_at >= now() - ($1 || ' days')::interval
     GROUP BY event_type
     ORDER BY count DESC`,
    [days]
  );
  return rows.map((r) => ({ eventType: r.event_type, count: Number(r.count) }));
}
