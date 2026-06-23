import { Router } from 'express';
import { z } from 'zod';
import { VisibilityLevel, MIN_ACCOUNT_AGE_DAYS_FOR_ANNOUNCEMENTS } from '@easysociety/shared';
import { pool } from '../../db/pool';
import { asyncHandler, ApiError } from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';
import { resolveVisibleScope } from '../../utils/locationScope';
import { attachVisitorTags } from '../../utils/visitorTag';
import { spamGuard } from '../../middleware/spamGuard';

const router = Router();

const createAnnouncementSchema = z.object({
  title: z.string().min(3).max(300),
  body: z.string().max(5000).nullable().optional(),
  visibility_level: z.nativeEnum(VisibilityLevel).default(VisibilityLevel.AREA),
  is_pinned: z.boolean().default(false),
});

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filterLevel = z.nativeEnum(VisibilityLevel).default(VisibilityLevel.AREA).parse(req.query.visibility);
    const me = await pool.query('SELECT location_id FROM users WHERE id = $1', [req.auth!.userId]);
    const viewerLocationId = me.rows[0]?.location_id;
    if (!viewerLocationId) throw new ApiError(400, 'Complete your profile/location first');

    const scope = await resolveVisibleScope(viewerLocationId, filterLevel);
    if (scope.locationIds.length === 0 && !scope.includeNational) {
      return res.json({ announcements: [] });
    }

    const { rows } = await pool.query(
      `SELECT a.id, a.posted_by_user_id, a.location_id, a.visibility_level, a.title, a.body,
              a.is_pinned, a.is_official, a.created_at,
              u.name AS author_name, u.profile_photo_url AS author_photo,
              u.role AS author_role, u.is_verified AS author_is_verified, u.verified_title AS author_verified_title
       FROM announcements a
       LEFT JOIN users u ON u.id = a.posted_by_user_id
       WHERE a.is_deleted = false
         AND ((a.location_id = ANY($1::uuid[])) OR ($2 AND a.visibility_level = 'national'))
       ORDER BY a.is_pinned DESC, a.created_at DESC
       LIMIT 50`,
      [scope.locationIds, scope.includeNational],
    );

    const withTags = await attachVisitorTags(rows, viewerLocationId);
    res.json({ announcements: withTags });
  }),
);

router.post(
  '/',
  requireAuth,
  spamGuard({ keyPrefix: 'announcement', windowSeconds: 600, max: 5 }),
  asyncHandler(async (req, res) => {
    const body = createAnnouncementSchema.parse(req.body);
    const me = await pool.query(
      'SELECT location_id, role, created_at FROM users WHERE id = $1',
      [req.auth!.userId],
    );
    if (!me.rows[0]?.location_id) throw new ApiError(400, 'Complete your profile/location first');

    const isOfficial = me.rows[0].role === 'moderator' || me.rows[0].role === 'admin';

    if (!isOfficial) {
      // Regular users post to the "Community Updates" section (is_official=false)
      // and only after the new-account anti-spam/anti-impersonation gate.
      const accountAgeDays = (Date.now() - new Date(me.rows[0].created_at).getTime()) / 86_400_000;
      if (accountAgeDays < MIN_ACCOUNT_AGE_DAYS_FOR_ANNOUNCEMENTS) {
        throw new ApiError(
          403,
          `Accounts must be at least ${MIN_ACCOUNT_AGE_DAYS_FOR_ANNOUNCEMENTS} days old to post in Community Updates`,
        );
      }
      if (body.is_pinned) {
        throw new ApiError(403, 'Only moderators/admins can pin announcements');
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO announcements (posted_by_user_id, location_id, visibility_level, title, body, is_pinned, is_official)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, posted_by_user_id, location_id, visibility_level, title, body, is_pinned, is_official, created_at`,
      [req.auth!.userId, me.rows[0].location_id, body.visibility_level, body.title, body.body ?? null,
        isOfficial ? body.is_pinned : false, isOfficial],
    );
    res.status(201).json({ announcement: rows[0] });
  }),
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const a = await pool.query('SELECT posted_by_user_id FROM announcements WHERE id = $1', [id]);
    if (!a.rows[0]) throw new ApiError(404, 'Announcement not found');
    if (a.rows[0].posted_by_user_id !== req.auth!.userId && req.auth!.role === 'user') {
      throw new ApiError(403, 'Not allowed to delete this announcement');
    }
    await pool.query('UPDATE announcements SET is_deleted = true WHERE id = $1', [id]);
    res.json({ ok: true });
  }),
);

router.post(
  '/:id/report',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const reason = z.string().min(1).max(1000).parse(req.body.reason);
    const { rows } = await pool.query(
      'INSERT INTO announcement_reports (user_id, announcement_id, reason) VALUES ($1, $2, $3) RETURNING id',
      [req.auth!.userId, id, reason],
    );
    res.status(201).json({ report_id: rows[0].id });
  }),
);

export default router;
