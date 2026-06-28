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

router.get(
  '/:userId/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = z.string().uuid().parse(req.params.userId);

    const { rows: userRows } = await pool.query(
      `SELECT
         u.id, u.name AS full_name, u.profile_photo_url, u.is_verified, u.created_at,
         l.name AS area_name,
         (SELECT COUNT(*)::int FROM answers a
           WHERE a.user_id = u.id AND a.is_deleted = false)          AS answers_count,
         (SELECT COUNT(*)::int FROM qa_recommendations r
            JOIN answers a2 ON a2.id = r.target_id
           WHERE a2.user_id = u.id AND r.target_type = 'answer')     AS helpful_count,
         (SELECT COUNT(*)::int FROM listings li
           WHERE li.user_id = u.id
             AND li.is_deleted = false AND li.is_active = true)      AS listings_count
       FROM users u
       LEFT JOIN locations l ON l.id = u.location_id
       WHERE u.id = $1 AND u.is_deleted = false`,
      [userId],
    );
    if (!userRows[0]) throw new ApiError(404, 'User not found');

    const { rows: listings } = await pool.query(
      `SELECT l.id, l.title, l.price, l.category, l.created_at,
              (SELECT photo_url FROM listing_photos p
                WHERE p.listing_id = l.id ORDER BY order_index LIMIT 1) AS cover_photo
       FROM listings l
       WHERE l.user_id = $1 AND l.is_deleted = false AND l.is_active = true
       ORDER BY l.created_at DESC LIMIT 6`,
      [userId],
    );

    const { rows: answers } = await pool.query(
      `SELECT a.id, a.body, a.created_at,
              q.title AS question_title, q.id AS question_id,
              (SELECT COUNT(*)::int FROM qa_recommendations r
                WHERE r.target_id = a.id AND r.target_type = 'answer') AS helpful_count
       FROM answers a
       JOIN questions q ON q.id = a.question_id
       WHERE a.user_id = $1 AND a.is_deleted = false AND q.is_deleted = false
       ORDER BY a.created_at DESC LIMIT 10`,
      [userId],
    );

    const { rows: skillRows } = await pool.query(
      `SELECT DISTINCT sd.service_type AS skill
       FROM service_details sd
       JOIN listings l ON l.id = sd.listing_id
       WHERE l.user_id = $1 AND l.is_deleted = false AND l.is_active = true
         AND sd.service_type IS NOT NULL`,
      [userId],
    );

    res.json({
      user:     userRows[0],
      listings,
      answers,
      skills:   skillRows.map((r: any) => r.skill),
    });
  }),
);

export default router;
