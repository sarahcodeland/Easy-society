import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { asyncHandler, ApiError } from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// ── My profile (MyProfileScreen) ─────────────────────────────────────────────
// These return bare objects/arrays, not wrapped in a key — the screen reads
// `data` directly.

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT u.id, u.name AS full_name, u.email, u.profile_photo_url, u.is_verified, u.role,
              u.preferred_language, u.created_at, u.location_id, l.name AS area_name
       FROM users u LEFT JOIN locations l ON l.id = u.location_id
       WHERE u.id = $1 AND u.is_deleted = false`,
      [req.auth!.userId],
    );
    if (!rows[0]) throw new ApiError(404, 'User not found');
    res.json(rows[0]);
  }),
);

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z.object({
      name: z.string().min(1).max(120).optional(),
      profile_photo_url: z.string().url().nullable().optional(),
    }).parse(req.body);
    const { rows } = await pool.query(
      `UPDATE users
       SET name = COALESCE($2, name),
           profile_photo_url = CASE WHEN $3 THEN $4 ELSE profile_photo_url END
       WHERE id = $1
       RETURNING id, name AS full_name, profile_photo_url`,
      [req.auth!.userId, body.name ?? null, body.profile_photo_url !== undefined, body.profile_photo_url ?? null],
    );
    res.json(rows[0]);
  }),
);

router.get(
  '/me/stats',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM questions  WHERE user_id = $1 AND is_deleted = false) AS questions,
         (SELECT COUNT(*)::int FROM answers    WHERE user_id = $1 AND is_deleted = false) AS answers,
         (SELECT COUNT(*)::int FROM listings   WHERE user_id = $1 AND is_deleted = false) AS listings,
         (SELECT COUNT(*)::int FROM businesses WHERE user_id = $1 AND is_deleted = false) AS businesses,
         (SELECT COUNT(*)::int FROM qa_recommendations r
            LEFT JOIN questions q ON r.target_type = 'question' AND q.id = r.target_id
            LEFT JOIN answers   a ON r.target_type = 'answer'   AND a.id = r.target_id
           WHERE COALESCE(q.user_id, a.user_id) = $1)
         + (SELECT COUNT(*)::int FROM listing_recommendations lr
              JOIN listings l ON l.id = lr.listing_id WHERE l.user_id = $1) AS recommendations`,
      [req.auth!.userId],
    );
    res.json(rows[0]);
  }),
);

router.get(
  '/me/listings',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT l.id, l.title, l.price, l.category, l.created_at,
              (SELECT photo_url FROM listing_photos p
                WHERE p.listing_id = l.id ORDER BY order_index LIMIT 1) AS cover_photo
       FROM listings l
       WHERE l.user_id = $1 AND l.is_deleted = false
       ORDER BY l.created_at DESC LIMIT 100`,
      [req.auth!.userId],
    );
    res.json(rows);
  }),
);

router.get(
  '/me/questions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT q.id, q.title, q.created_at, q.is_anonymous,
              (SELECT COUNT(*)::int FROM answers a
                WHERE a.question_id = q.id AND a.is_deleted = false) AS answers_count
       FROM questions q
       WHERE q.user_id = $1 AND q.is_deleted = false
       ORDER BY q.created_at DESC LIMIT 100`,
      [req.auth!.userId],
    );
    res.json(rows);
  }),
);

router.get(
  '/me/answers',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT a.id, a.body, a.created_at, q.id AS question_id, q.title AS question_title,
              (SELECT COUNT(*)::int FROM qa_recommendations r
                WHERE r.target_id = a.id AND r.target_type = 'answer') AS helpful_count
       FROM answers a
       JOIN questions q ON q.id = a.question_id
       WHERE a.user_id = $1 AND a.is_deleted = false AND q.is_deleted = false
       ORDER BY a.created_at DESC LIMIT 100`,
      [req.auth!.userId],
    );
    res.json(rows);
  }),
);

// Includes expired statuses — this is the author's own archive.
router.get(
  '/me/statuses',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, media_type, text_content, content_url, visibility, created_at, expires_at
       FROM statuses
       WHERE user_id = $1 AND is_deleted = false
       ORDER BY created_at DESC LIMIT 100`,
      [req.auth!.userId],
    );
    res.json(rows);
  }),
);

router.get(
  '/me/businesses',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT b.id, b.name, b.category, b.created_at,
              (SELECT photo_url FROM business_photos p
                WHERE p.business_id = b.id ORDER BY order_index LIMIT 1) AS logo_url
       FROM businesses b
       WHERE b.user_id = $1 AND b.is_deleted = false
       ORDER BY b.created_at DESC LIMIT 100`,
      [req.auth!.userId],
    );
    res.json(rows);
  }),
);

router.get(
  '/me/activity',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `(SELECT id, 'listing' AS type, title, category::text AS subtitle, created_at
          FROM listings WHERE user_id = $1 AND is_deleted = false)
       UNION ALL
       (SELECT id, 'question', title, NULL, created_at
          FROM questions WHERE user_id = $1 AND is_deleted = false)
       UNION ALL
       (SELECT a.id, 'answer', LEFT(a.body, 120), q.title, a.created_at
          FROM answers a JOIN questions q ON q.id = a.question_id
         WHERE a.user_id = $1 AND a.is_deleted = false)
       UNION ALL
       (SELECT id, 'status', COALESCE(LEFT(text_content, 120), media_type::text), NULL, created_at
          FROM statuses WHERE user_id = $1 AND is_deleted = false)
       UNION ALL
       (SELECT id, 'business', name, category, created_at
          FROM businesses WHERE user_id = $1 AND is_deleted = false)
       ORDER BY created_at DESC LIMIT 50`,
      [req.auth!.userId],
    );
    res.json(rows);
  }),
);

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
