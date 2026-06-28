import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { asyncHandler, ApiError } from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.get(
  '/members',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = z.enum(['all', 'active', 'verified', 'helpful', 'neighbors'])
      .default('all')
      .parse(req.query.filter ?? 'all');
    const search = req.query.search ? String(req.query.search) : null;
    const page   = z.coerce.number().int().min(0).default(0).parse(req.query.page ?? '0');
    const limit  = 20;
    const offset = page * limit;

    const me = await pool.query('SELECT location_id FROM users WHERE id = $1', [req.auth!.userId]);
    const locationId = me.rows[0]?.location_id;
    if (!locationId) throw new ApiError(400, 'Complete your profile first');

    // CTE keeps the helpful_count derivation in one place so ORDER BY can reference it
    const { rows } = await pool.query(
      `WITH members AS (
         SELECT
           u.id,
           u.name                AS full_name,
           u.profile_photo_url,
           u.is_verified,
           u.updated_at          AS last_active_at,
           l.name                AS area_name,
           (SELECT COUNT(*)::int FROM answers a
             WHERE a.user_id = u.id AND a.is_deleted = false)        AS answers_count,
           (SELECT COUNT(*)::int FROM qa_recommendations r
              JOIN answers a2 ON a2.id = r.target_id
             WHERE a2.user_id = u.id AND r.target_type = 'answer')   AS helpful_count,
           (SELECT COUNT(*)::int FROM listings li
             WHERE li.user_id = u.id
               AND li.is_deleted = false AND li.is_active = true)    AS listings_count
         FROM users u
         LEFT JOIN locations l ON l.id = u.location_id
         WHERE u.location_id = $1
           AND u.is_deleted   = false
           AND u.id          != $2
           AND (
             $3::text IS NULL
             OR u.name ILIKE '%' || $3 || '%'
             OR l.name ILIKE '%' || $3 || '%'
           )
           AND (
             $4 = 'all' OR $4 = 'neighbors'
             OR ($4 = 'verified' AND u.is_verified = true)
             OR ($4 = 'active'   AND u.updated_at > NOW() - INTERVAL '7 days')
             OR  $4 = 'helpful'
           )
       )
       SELECT * FROM members
       ORDER BY
         CASE WHEN $4 = 'helpful' THEN helpful_count ELSE 0 END DESC,
         last_active_at DESC
       LIMIT $5 OFFSET $6`,
      [locationId, req.auth!.userId, search, filter, limit, offset],
    );

    res.json({ members: rows, page, has_more: rows.length === limit });
  }),
);

export default router;
