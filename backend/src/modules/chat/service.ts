import { pool } from '../../db/pool';
import { redis } from '../../config/redis';
import { ApiError } from '../../middleware/errorHandler';
import { MessageType } from '@easysociety/shared';

const RECENT_CACHE_SIZE = 50;
const RECENT_CACHE_TTL_SECONDS = 3600;

function recentKey(groupId: string) {
  return `chat:recent:${groupId}`;
}

export interface ChatMessageRow {
  id: string;
  group_id: string;
  sender_user_id: string | null;
  message_type: MessageType;
  content: string | null;
  reply_to_message_id: string | null;
  is_deleted: boolean;
  created_at: string;
  sender_name?: string;
  sender_photo?: string | null;
  sender_location_id?: string | null;
}

export async function assertMember(groupId: string, userId: string): Promise<void> {
  const { rows } = await pool.query(
    'SELECT 1 FROM chat_group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId],
  );
  if (rows.length === 0) {
    throw new ApiError(403, 'Not a member of this chat group');
  }
}

export async function isMuted(groupId: string, userId: string): Promise<boolean> {
  const muted = await redis.get(`chat:muted:${groupId}:${userId}`);
  return muted === '1';
}

export async function persistMessage(input: {
  groupId: string;
  senderUserId: string;
  messageType: MessageType;
  content: string | null;
  replyToMessageId: string | null;
}): Promise<ChatMessageRow> {
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (group_id, sender_user_id, message_type, content, reply_to_message_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, group_id, sender_user_id, message_type, content, reply_to_message_id, is_deleted, created_at`,
    [input.groupId, input.senderUserId, input.messageType, input.content, input.replyToMessageId],
  );
  const message = rows[0] as ChatMessageRow;

  const sender = await pool.query(
    'SELECT name, profile_photo_url, location_id FROM users WHERE id = $1',
    [input.senderUserId],
  );
  message.sender_name = sender.rows[0]?.name;
  message.sender_photo = sender.rows[0]?.profile_photo_url ?? null;
  message.sender_location_id = sender.rows[0]?.location_id ?? null;

  await redis.lpush(recentKey(input.groupId), JSON.stringify(message));
  await redis.ltrim(recentKey(input.groupId), 0, RECENT_CACHE_SIZE - 1);
  await redis.expire(recentKey(input.groupId), RECENT_CACHE_TTL_SECONDS);

  return message;
}

export async function getRecentMessages(groupId: string, limit = 50): Promise<ChatMessageRow[]> {
  const cachedRaw = await redis.lrange(recentKey(groupId), 0, limit - 1);
  if (cachedRaw.length >= Math.min(limit, RECENT_CACHE_SIZE)) {
    return cachedRaw.map((r) => JSON.parse(r) as ChatMessageRow).reverse();
  }

  const { rows } = await pool.query(
    `SELECT m.id, m.group_id, m.sender_user_id, m.message_type, m.content, m.reply_to_message_id,
            m.is_deleted, m.created_at, u.name AS sender_name, u.profile_photo_url AS sender_photo,
            u.location_id AS sender_location_id
     FROM chat_messages m
     LEFT JOIN users u ON u.id = m.sender_user_id
     WHERE m.group_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2`,
    [groupId, limit],
  );
  return rows.reverse();
}

export async function getOlderMessages(groupId: string, beforeCreatedAt: string, limit = 50): Promise<ChatMessageRow[]> {
  const { rows } = await pool.query(
    `SELECT m.id, m.group_id, m.sender_user_id, m.message_type, m.content, m.reply_to_message_id,
            m.is_deleted, m.created_at, u.name AS sender_name, u.profile_photo_url AS sender_photo,
            u.location_id AS sender_location_id
     FROM chat_messages m
     LEFT JOIN users u ON u.id = m.sender_user_id
     WHERE m.group_id = $1 AND m.created_at < $2
     ORDER BY m.created_at DESC
     LIMIT $3`,
    [groupId, beforeCreatedAt, limit],
  );
  return rows.reverse();
}
