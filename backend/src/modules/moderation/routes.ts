import { Router } from 'express';
import { z } from 'zod';
import { ModerationAction, ModerationTargetType, UserRole } from '@easysociety/shared';
import { pool } from '../../db/pool';
import { redis } from '../../config/redis';
import { asyncHandler, ApiError } from '../../middleware/errorHandler';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.use(requireAuth, requireRole(UserRole.MODERATOR, UserRole.ADMIN));

// Aggregated open-report queue across every report table, newest first.
// Moderators triage from one screen instead of five.
router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT 'user' AS target_type, id, reported_user_id AS target_id, reason, created_at FROM user_reports
       UNION ALL
       SELECT 'message', id, message_id, reason, created_at FROM message_reports
       UNION ALL
       SELECT 'question_or_answer', id, target_id, reason, created_at FROM qa_reports
       UNION ALL
       SELECT 'listing', id, listing_id, reason, created_at FROM listing_reports
       UNION ALL
       SELECT 'announcement', id, announcement_id, reason, created_at FROM announcement_reports
       ORDER BY created_at DESC LIMIT 200`,
    );
    res.json({ reports: rows });
  }),
);

const actionSchema = z.object({
  target_type: z.nativeEnum(ModerationTargetType),
  target_id: z.string().uuid(),
  action: z.nativeEnum(ModerationAction),
  reason: z.string().max(1000).nullable().optional(),
});

router.post(
  '/actions',
  asyncHandler(async (req, res) => {
    const body = actionSchema.parse(req.body);

    if (body.target_type === ModerationTargetType.USER) {
      if (body.action === ModerationAction.BAN) {
        await pool.query('UPDATE users SET is_banned = true WHERE id = $1', [body.target_id]);
        await redis.del(`user:banned:${body.target_id}`);
      } else if (body.action === ModerationAction.RESTORE) {
        await pool.query('UPDATE users SET is_banned = false WHERE id = $1', [body.target_id]);
        await redis.del(`user:banned:${body.target_id}`);
      }
    } else if (body.action === ModerationAction.REMOVE) {
      const table = {
        message: 'chat_messages',
        post: 'questions',
        listing: 'listings',
        announcement: 'announcements',
      }[body.target_type];
      if (table) {
        await pool.query(`UPDATE ${table} SET is_deleted = true WHERE id = $1`, [body.target_id]);
      }
    } else if (body.action === ModerationAction.RESTORE) {
      const table = {
        message: 'chat_messages',
        post: 'questions',
        listing: 'listings',
        announcement: 'announcements',
      }[body.target_type];
      if (table) {
        await pool.query(`UPDATE ${table} SET is_deleted = false WHERE id = $1`, [body.target_id]);
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO moderation_actions (moderator_user_id, target_type, target_id, action, reason)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, target_type, target_id, action, reason, created_at`,
      [req.auth!.userId, body.target_type, body.target_id, body.action, body.reason ?? null],
    );
    res.status(201).json({ moderation_action: rows[0] });
  }),
);

router.get(
  '/actions',
  asyncHandler(async (req, res) => {
    const targetType = req.query.target_type ? z.nativeEnum(ModerationTargetType).parse(req.query.target_type) : null;
    const { rows } = await pool.query(
      `SELECT id, moderator_user_id, target_type, target_id, action, reason, created_at
       FROM moderation_actions WHERE ($1::text IS NULL OR target_type = $1) ORDER BY created_at DESC LIMIT 200`,
      [targetType],
    );
    res.json({ moderation_actions: rows });
  }),
);

router.post(
  '/chat-groups/:groupId/members/:userId/moderator',
  asyncHandler(async (req, res) => {
    const groupId = z.string().uuid().parse(req.params.groupId);
    const userId = z.string().uuid().parse(req.params.userId);
    const isModerator = z.boolean().parse(req.body.is_moderator);
    const result = await pool.query(
      'UPDATE chat_group_members SET is_moderator = $1 WHERE group_id = $2 AND user_id = $3',
      [isModerator, groupId, userId],
    );
    if (result.rowCount === 0) throw new ApiError(404, 'Membership not found');
    res.json({ ok: true });
  }),
);

export default router;
