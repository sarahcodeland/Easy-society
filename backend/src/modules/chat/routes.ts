import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { asyncHandler, ApiError } from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';
import { redis } from '../../config/redis';
import { assertMember, getOlderMessages, getRecentMessages } from './service';
import { attachVisitorTags } from '../../utils/visitorTag';

const router = Router();

router.get(
  '/groups/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT g.id, g.location_id, g.name, m.is_moderator, m.joined_at
       FROM chat_group_members m
       JOIN chat_groups g ON g.id = m.group_id
       WHERE m.user_id = $1
       ORDER BY m.joined_at`,
      [req.auth!.userId],
    );
    res.json({ groups: rows });
  }),
);

router.get(
  '/groups/:groupId/messages',
  requireAuth,
  asyncHandler(async (req, res) => {
    const groupId = z.string().uuid().parse(req.params.groupId);
    await assertMember(groupId, req.auth!.userId);

    const before = req.query.before ? z.string().parse(req.query.before) : null;
    const messages = before
      ? await getOlderMessages(groupId, before, 50)
      : await getRecentMessages(groupId, 50);

    const me = await pool.query('SELECT location_id FROM users WHERE id = $1', [req.auth!.userId]);
    const withTags = await attachVisitorTags(
      messages.map((m) => ({ ...m, location_id: m.sender_location_id ?? null })),
      me.rows[0]?.location_id ?? null,
    );
    res.json({ messages: withTags });
  }),
);

router.get(
  '/groups/:groupId/members',
  requireAuth,
  asyncHandler(async (req, res) => {
    const groupId = z.string().uuid().parse(req.params.groupId);
    await assertMember(groupId, req.auth!.userId);
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.profile_photo_url, m.is_moderator, m.joined_at
       FROM chat_group_members m JOIN users u ON u.id = m.user_id
       WHERE m.group_id = $1 ORDER BY m.is_moderator DESC, u.name`,
      [groupId],
    );
    res.json({ members: rows });
  }),
);

// Mute is per-user, per-group, and self-service (does not require being a
// moderator) — it just silences push/socket delivery for the requester.
router.post(
  '/groups/:groupId/mute',
  requireAuth,
  asyncHandler(async (req, res) => {
    const groupId = z.string().uuid().parse(req.params.groupId);
    await assertMember(groupId, req.auth!.userId);
    const muted = z.boolean().parse(req.body.muted);
    const key = `chat:muted:${groupId}:${req.auth!.userId}`;
    if (muted) await redis.set(key, '1');
    else await redis.del(key);
    res.json({ muted });
  }),
);

router.post(
  '/messages/:messageId/report',
  requireAuth,
  asyncHandler(async (req, res) => {
    const messageId = z.string().uuid().parse(req.params.messageId);
    const reason = z.string().min(1).max(1000).parse(req.body.reason);
    const { rows } = await pool.query(
      `INSERT INTO message_reports (message_id, reported_by_user_id, reason)
       VALUES ($1, $2, $3) RETURNING id`,
      [messageId, req.auth!.userId, reason],
    );
    res.status(201).json({ report_id: rows[0].id });
  }),
);

// Share any content type (status/listing/question/answer) into a chat group.
// Creates a chat_shares record; the client renders it as a rich preview card
// inside the chat thread.
router.post(
  '/shares',
  requireAuth,
  asyncHandler(async (req, res) => {
    const shareSchema = z.object({
      group_id:    z.string().uuid(),
      target_type: z.enum(['status', 'listing', 'question', 'answer']),
      target_id:   z.string().uuid(),
      message:     z.string().max(500).optional(),
    });
    const body = shareSchema.parse(req.body);

    await assertMember(body.group_id, req.auth!.userId);

    const { rows } = await pool.query(
      `INSERT INTO chat_shares (sender_id, group_id, target_type, target_id, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, sender_id, group_id, target_type, target_id, message, created_at`,
      [req.auth!.userId, body.group_id, body.target_type, body.target_id, body.message ?? null],
    );
    res.status(201).json({ share: rows[0] });
  }),
);

// Moderator-only: soft-delete a message (removes content, keeps row for audit).
router.delete(
  '/messages/:messageId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const messageId = z.string().uuid().parse(req.params.messageId);
    const msg = await pool.query('SELECT group_id FROM chat_messages WHERE id = $1', [messageId]);
    if (!msg.rows[0]) throw new ApiError(404, 'Message not found');

    const membership = await pool.query(
      'SELECT is_moderator FROM chat_group_members WHERE group_id = $1 AND user_id = $2',
      [msg.rows[0].group_id, req.auth!.userId],
    );
    if (!membership.rows[0]?.is_moderator && req.auth!.role === 'user') {
      throw new ApiError(403, 'Only group moderators or platform staff can remove messages');
    }

    await pool.query('UPDATE chat_messages SET is_deleted = true WHERE id = $1', [messageId]);
    await pool.query(
      `INSERT INTO moderation_actions (moderator_user_id, target_type, target_id, action, reason)
       VALUES ($1, 'message', $2, 'remove', $3)`,
      [req.auth!.userId, messageId, req.body?.reason ?? null],
    );
    res.json({ ok: true });
  }),
);

export default router;
