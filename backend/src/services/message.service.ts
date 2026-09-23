import { pool, withTransaction } from "../config/db";
import { ApiError } from "../utils/ApiError";
import type { ConversationWithRelationsRow, MessageRow } from "../types/db";

function paginate(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

function toPublicMessage(m: MessageRow, viewerId: string) {
  return {
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    isOwn: m.sender_id === viewerId,
    body: m.body,
    isRead: m.is_read,
    createdAt: m.created_at,
  };
}

function toPublicConversation(c: ConversationWithRelationsRow) {
  return {
    id: c.id,
    otherUser: {
      id: c.other_user_id,
      username: c.other_username,
      fullName: c.other_full_name,
      avatarUrl: c.other_avatar_url,
    },
    lastMessage: c.last_message_body
      ? { body: c.last_message_body, senderId: c.last_message_sender_id }
      : null,
    lastMessageAt: c.last_message_at,
    unreadCount: Number(c.unread_count),
    createdAt: c.created_at,
  };
}

/**
 * Conversations are keyed by an *ordered* pair of user ids (smaller UUID
 * first — enforced by the schema's CHECK constraint) so A→B and B→A always
 * resolve to the same row, regardless of who messages first.
 */
async function findOrCreateConversationId(userId: string, otherUserId: string): Promise<string> {
  if (userId === otherUserId) throw ApiError.badRequest("You can't message yourself");

  const { rows: targetRows } = await pool.query("SELECT id FROM users WHERE id = $1 AND is_banned = FALSE", [
    otherUserId,
  ]);
  if (!targetRows[0]) throw ApiError.notFound("User not found");

  const [userOne, userTwo] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];

  const { rows: existing } = await pool.query<{ id: string }>(
    "SELECT id FROM conversations WHERE user_one_id = $1 AND user_two_id = $2",
    [userOne, userTwo]
  );
  if (existing[0]) return existing[0].id;

  const { rows: created } = await pool.query<{ id: string }>(
    `INSERT INTO conversations (user_one_id, user_two_id) VALUES ($1, $2)
     ON CONFLICT (user_one_id, user_two_id) DO UPDATE SET user_one_id = EXCLUDED.user_one_id
     RETURNING id`,
    [userOne, userTwo]
  );
  return created[0].id;
}

/** Starts (or resumes) a conversation with `otherUsername` — the "Message" button's entry point. */
export async function startConversationByUsername(userId: string, otherUsername: string) {
  const { rows } = await pool.query<{ id: string }>("SELECT id FROM users WHERE username = $1", [
    otherUsername,
  ]);
  if (!rows[0]) throw ApiError.notFound("User not found");
  const conversationId = await findOrCreateConversationId(userId, rows[0].id);
  return getConversationById(conversationId, userId);
}

async function assertParticipant(conversationId: string, userId: string) {
  const { rows } = await pool.query<{ user_one_id: string; user_two_id: string }>(
    "SELECT user_one_id, user_two_id FROM conversations WHERE id = $1",
    [conversationId]
  );
  const convo = rows[0];
  if (!convo) throw ApiError.notFound("Conversation not found");
  if (convo.user_one_id !== userId && convo.user_two_id !== userId) {
    throw ApiError.forbidden("You're not part of this conversation");
  }
}

const CONVERSATION_SELECT = (viewerParamIndex: number) => `
  SELECT c.*,
         ou.id AS other_user_id, ou.username AS other_username, ou.full_name AS other_full_name,
         op.avatar_url AS other_avatar_url,
         lm.body AS last_message_body, lm.sender_id AS last_message_sender_id,
         COALESCE(uc.unread_count, 0) AS unread_count
  FROM conversations c
  JOIN users ou ON ou.id = (CASE WHEN c.user_one_id = $${viewerParamIndex} THEN c.user_two_id ELSE c.user_one_id END)
  LEFT JOIN profiles op ON op.user_id = ou.id
  LEFT JOIN LATERAL (
    SELECT body, sender_id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
  ) lm ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS unread_count FROM messages
    WHERE conversation_id = c.id AND is_read = FALSE AND sender_id <> $${viewerParamIndex}
  ) uc ON TRUE
`;

export async function getConversationById(conversationId: string, viewerId: string) {
  await assertParticipant(conversationId, viewerId);
  const { rows } = await pool.query<ConversationWithRelationsRow>(
    `${CONVERSATION_SELECT(2)} WHERE c.id = $1`,
    [conversationId, viewerId]
  );
  return toPublicConversation(rows[0]);
}

/** Chat list (spec: friends chat) — ordered by most recent activity, with per-conversation unread counts. */
export async function listConversations(userId: string, page: number, limit: number) {
  const offset = (page - 1) * limit;

  const countQuery = "SELECT COUNT(*) FROM conversations WHERE user_one_id = $1 OR user_two_id = $1";
  const listQuery = `
    ${CONVERSATION_SELECT(1)}
    WHERE c.user_one_id = $1 OR c.user_two_id = $1
    ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
    LIMIT $2 OFFSET $3`;

  const [{ rows: countRows }, { rows }, { rows: unreadRows }] = await Promise.all([
    pool.query<{ count: string }>(countQuery, [userId]),
    pool.query<ConversationWithRelationsRow>(listQuery, [userId, limit, offset]),
    pool.query<{ total_unread: string }>(
      `SELECT COUNT(*) AS total_unread FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE (c.user_one_id = $1 OR c.user_two_id = $1) AND m.is_read = FALSE AND m.sender_id <> $1`,
      [userId]
    ),
  ]);

  const total = Number(countRows[0].count);
  return {
    items: rows.map(toPublicConversation),
    totalUnreadCount: Number(unreadRows[0].total_unread),
    ...paginate(page, limit, total),
  };
}

/** Newest-first page of messages in a conversation (caller reverses for chronological display). */
export async function listMessages(conversationId: string, viewerId: string, page: number, limit: number) {
  await assertParticipant(conversationId, viewerId);
  const offset = (page - 1) * limit;

  const [{ rows: countRows }, { rows }] = await Promise.all([
    pool.query<{ count: string }>("SELECT COUNT(*) FROM messages WHERE conversation_id = $1", [conversationId]),
    pool.query<MessageRow>(
      "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [conversationId, limit, offset]
    ),
  ]);

  const total = Number(countRows[0].count);
  return { items: rows.map((m) => toPublicMessage(m, viewerId)), ...paginate(page, limit, total) };
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  await assertParticipant(conversationId, senderId);

  const message = await withTransaction(async (client) => {
    const { rows } = await client.query<MessageRow>(
      "INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3) RETURNING *",
      [conversationId, senderId, body]
    );
    await client.query("UPDATE conversations SET last_message_at = now() WHERE id = $1", [conversationId]);
    return rows[0];
  });

  return toPublicMessage(message, senderId);
}

/** Marks every message *from the other participant* as read (called when the thread is opened). */
export async function markConversationRead(conversationId: string, viewerId: string) {
  await assertParticipant(conversationId, viewerId);
  await pool.query(
    "UPDATE messages SET is_read = TRUE WHERE conversation_id = $1 AND sender_id <> $2 AND is_read = FALSE",
    [conversationId, viewerId]
  );
}
