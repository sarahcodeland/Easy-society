import { Router } from 'express';
import { z } from 'zod';
import { StatusMediaType, STATUS_EXPIRY_HOURS } from '@easysociety/shared';
import { pool } from '../../db/pool';
import { asyncHandler, ApiError } from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';

const router = Router();

const createStatusSchema = z.object({
  media_type: z.nativeEnum(StatusMediaType),
  content_url: z.string().url().nullable().optional(),
  text_content: z.string().max(1000).nullable().optional(),
});

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = createStatusSchema.parse(req.body);
    if (body.media_type !== StatusMediaType.TEXT && !body.content_url) {
      throw new ApiError(400, 'content_url is required for photo/video statuses');
    }
    const me = await pool.query('SELECT location_id FROM users WHERE id = $1', [req.auth!.userId]);
    if (!me.rows[0]?.location_id) throw new ApiError(400, 'Complete your profile/location first');

    const { rows } = await pool.query(
      `INSERT INTO statuses (user_id, location_id, media_type, content_url, text_content, expires_at)
       VALUES ($1, $2, $3, $4, $5, now() + interval '${STATUS_EXPIRY_HOURS} hours')
       RETURNING id, user_id, location_id, media_type, content_url, text_content, expires_at, created_at`,
      [req.auth!.userId, me.rows[0].location_id, body.media_type, body.content_url ?? null, body.text_content ?? null],
    );
    res.status(201).json({ status: rows[0] });
  }),
);

// GET /statuses/feed — area-scoped, unexpired, grouped by author for the
// Instagram-style story tray. Visitor tag is implicit (location_id present).
router.get(
  '/feed',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = await pool.query('SELECT location_id FROM users WHERE id = $1', [req.auth!.userId]);
    const locationId = me.rows[0]?.location_id;
    if (!locationId) throw new ApiError(400, 'Complete your profile/location first');

    const { rows } = await pool.query(
      `SELECT s.id, s.user_id, s.media_type, s.content_url, s.text_content, s.expires_at, s.created_at,
              u.name AS author_name, u.profile_photo_url AS author_photo
       FROM statuses s
       JOIN users u ON u.id = s.user_id
       WHERE s.location_id = $1 AND s.is_deleted = false AND s.expires_at > now()
         AND s.user_id NOT IN (SELECT blocked_user_id FROM user_blocks WHERE blocker_user_id = $2)
       ORDER BY s.created_at DESC`,
      [locationId, req.auth!.userId],
    );
    res.json({ statuses: rows });
  }),
);

router.post(
  '/:id/view',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await pool.query(
      `INSERT INTO status_views (status_id, viewer_user_id) VALUES ($1, $2)
       ON CONFLICT (status_id, viewer_user_id) DO NOTHING`,
      [id, req.auth!.userId],
    );
    res.status(201).json({ ok: true });
  }),
);

// Viewer list — only the status owner may see who viewed it.
router.get(
  '/:id/views',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const status = await pool.query('SELECT user_id FROM statuses WHERE id = $1', [id]);
    if (!status.rows[0]) throw new ApiError(404, 'Status not found');
    if (status.rows[0].user_id !== req.auth!.userId) {
      throw new ApiError(403, 'Only the author can see the viewer list');
    }
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.profile_photo_url, v.viewed_at
       FROM status_views v JOIN users u ON u.id = v.viewer_user_id
       WHERE v.status_id = $1 ORDER BY v.viewed_at DESC`,
      [id],
    );
    res.json({ viewers: rows });
  }),
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const status = await pool.query('SELECT user_id FROM statuses WHERE id = $1', [id]);
    if (!status.rows[0]) throw new ApiError(404, 'Status not found');
    if (status.rows[0].user_id !== req.auth!.userId && req.auth!.role === 'user') {
      throw new ApiError(403, 'Not allowed to delete this status');
    }
    await pool.query('UPDATE statuses SET is_deleted = true WHERE id = $1', [id]);
    res.json({ ok: true });
  }),
);

export default router;
