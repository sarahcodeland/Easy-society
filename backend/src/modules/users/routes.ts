import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { asyncHandler, ApiError } from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// Blocking is platform-wide: a blocked user's chat messages, Q&A posts,
// comments, and listings should be filtered out of feeds for the blocker.
// Enforcing that filter is the responsibility of each feed query (it joins
// against user_blocks); this endpoint just manages the block relationship.
router.post(
  '/:userId/block',
  requireAuth,
  asyncHandler(async (req, res) => {
    const blockedUserId = z.string().uuid().parse(req.params.userId);
    if (blockedUserId === req.auth!.userId) {
      throw new ApiError(400, 'Cannot block yourself');
    }
    await pool.query(
      `INSERT INTO user_blocks (blocker_user_id, blocked_user_id) VALUES ($1, $2)
       ON CONFLICT (blocker_user_id, blocked_user_id) DO NOTHING`,
      [req.auth!.userId, blockedUserId],
    );
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  '/:userId/block',
  requireAuth,
  asyncHandler(async (req, res) => {
    const blockedUserId = z.string().uuid().parse(req.params.userId);
    await pool.query(
      'DELETE FROM user_blocks WHERE blocker_user_id = $1 AND blocked_user_id = $2',
      [req.auth!.userId, blockedUserId],
    );
    res.json({ ok: true });
  }),
);

router.get(
  '/me/blocked',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.profile_photo_url FROM user_blocks b
       JOIN users u ON u.id = b.blocked_user_id
       WHERE b.blocker_user_id = $1`,
      [req.auth!.userId],
    );
    res.json({ blocked: rows });
  }),
);

router.post(
  '/:userId/report',
  requireAuth,
  asyncHandler(async (req, res) => {
    const reportedUserId = z.string().uuid().parse(req.params.userId);
    const reason = z.string().min(1).max(1000).parse(req.body.reason);
    if (reportedUserId === req.auth!.userId) {
      throw new ApiError(400, 'Cannot report yourself');
    }
    const { rows } = await pool.query(
      `INSERT INTO user_reports (reported_by_user_id, reported_user_id, reason)
       VALUES ($1, $2, $3) RETURNING id`,
      [req.auth!.userId, reportedUserId, reason],
    );
    res.status(201).json({ report_id: rows[0].id });
  }),
);

export default router;
