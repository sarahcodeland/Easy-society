import { Router } from 'express';
import { z } from 'zod';
import { ListingCategory, ReactionType, VisibilityLevel } from '@easysociety/shared';
import { pool } from '../../db/pool';
import { asyncHandler, ApiError } from '../../middleware/errorHandler';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { resolveVisibleScope } from '../../utils/locationScope';
import { attachVisitorTags } from '../../utils/visitorTag';
import { spamGuard } from '../../middleware/spamGuard';

const router = Router();

const createListingSchema = z.object({
  category: z.nativeEnum(ListingCategory),
  sub_category: z.string().max(80).nullable().optional(),
  title: z.string().min(3).max(200),
  description: z.string().max(5000).nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  contact_info: z.string().max(200).nullable().optional(),
  visibility_level: z.nativeEnum(VisibilityLevel).default(VisibilityLevel.AREA),
  photo_urls: z.array(z.string().url()).max(10).default([]),
});

router.get(
  '/listings',
  requireAuth,
  asyncHandler(async (req, res) => {
    const category = z.nativeEnum(ListingCategory).optional().parse(req.query.category);
    const filterLevel = z.nativeEnum(VisibilityLevel).default(VisibilityLevel.AREA).parse(req.query.visibility);

    const me = await pool.query('SELECT location_id FROM users WHERE id = $1', [req.auth!.userId]);
    const viewerLocationId = me.rows[0]?.location_id;
    if (!viewerLocationId) throw new ApiError(400, 'Complete your profile/location first');

    const scope = await resolveVisibleScope(viewerLocationId, filterLevel);
    if (scope.locationIds.length === 0 && !scope.includeNational) {
      return res.json({ listings: [] });
    }

    const { rows } = await pool.query(
      `SELECT l.id, l.user_id, l.location_id, l.visibility_level, l.category, l.sub_category,
              l.title, l.description, l.price, l.contact_info, l.is_active, l.created_at,
              u.name AS author_name, u.profile_photo_url AS author_photo,
              COALESCE(r.count, 0) AS recommendation_count,
              (SELECT photo_url FROM listing_photos p WHERE p.listing_id = l.id ORDER BY order_index LIMIT 1) AS cover_photo_url
       FROM listings l
       LEFT JOIN users u ON u.id = l.user_id
       LEFT JOIN (
         SELECT listing_id, COUNT(*) AS count FROM listing_recommendations GROUP BY listing_id
       ) r ON r.listing_id = l.id
       WHERE l.is_deleted = false AND l.is_active = true
         AND l.user_id NOT IN (SELECT blocked_user_id FROM user_blocks WHERE blocker_user_id = $3)
         AND (l.category = $4 OR $4 IS NULL)
         AND ((l.location_id = ANY($1::uuid[])) OR ($2 AND l.visibility_level = 'national'))
       ORDER BY l.created_at DESC
       LIMIT 50`,
      [scope.locationIds, scope.includeNational, req.auth!.userId, category ?? null],
    );

    const withTags = await attachVisitorTags(rows, viewerLocationId);
    res.json({ listings: withTags });
  }),
);

router.post(
  '/listings',
  requireAuth,
  spamGuard({ keyPrefix: 'marketplace-listing', windowSeconds: 600, max: 10 }),
  asyncHandler(async (req, res) => {
    const body = createListingSchema.parse(req.body);
    const me = await pool.query('SELECT location_id FROM users WHERE id = $1', [req.auth!.userId]);
    if (!me.rows[0]?.location_id) throw new ApiError(400, 'Complete your profile/location first');

    const inserted = await pool.query(
      `INSERT INTO listings (user_id, location_id, visibility_level, category, sub_category, title, description, price, contact_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, user_id, location_id, visibility_level, category, sub_category, title, description, price, contact_info, is_active, created_at`,
      [req.auth!.userId, me.rows[0].location_id, body.visibility_level, body.category, body.sub_category ?? null,
        body.title, body.description ?? null, body.price ?? null, body.contact_info ?? null],
    );
    const listing = inserted.rows[0];

    if (body.photo_urls.length > 0) {
      const values = body.photo_urls.map((_, i) => `($1, $${i + 2}, ${i})`).join(', ');
      await pool.query(
        `INSERT INTO listing_photos (listing_id, photo_url, order_index) VALUES ${values}`,
        [listing.id, ...body.photo_urls],
      );
    }

    res.status(201).json({ listing });
  }),
);

router.get(
  '/listings/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const listing = await pool.query(
      `SELECT l.*, u.name AS author_name, u.profile_photo_url AS author_photo
       FROM listings l LEFT JOIN users u ON u.id = l.user_id
       WHERE l.id = $1 AND l.is_deleted = false`,
      [id],
    );
    if (!listing.rows[0]) throw new ApiError(404, 'Listing not found');

    const photos = await pool.query(
      'SELECT id, photo_url, order_index FROM listing_photos WHERE listing_id = $1 ORDER BY order_index',
      [id],
    );
    const reactions = await pool.query(
      `SELECT reaction_type, COUNT(*) AS count FROM listing_reactions WHERE listing_id = $1 GROUP BY reaction_type`,
      [id],
    );
    const recommendationCount = await pool.query(
      'SELECT COUNT(*) AS count FROM listing_recommendations WHERE listing_id = $1',
      [id],
    );

    res.json({
      listing: listing.rows[0],
      photos: photos.rows,
      reactions: reactions.rows,
      recommendation_count: Number(recommendationCount.rows[0].count),
    });
  }),
);

router.delete(
  '/listings/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const listing = await pool.query('SELECT user_id FROM listings WHERE id = $1', [id]);
    if (!listing.rows[0]) throw new ApiError(404, 'Listing not found');
    if (listing.rows[0].user_id !== req.auth!.userId && req.auth!.role === 'user') {
      throw new ApiError(403, 'Not allowed to delete this listing');
    }
    await pool.query('UPDATE listings SET is_deleted = true WHERE id = $1', [id]);
    res.json({ ok: true });
  }),
);

// Same credibility system as Q&A, especially relevant for verifying job
// posting genuineness.
router.post(
  '/listings/:id/recommend',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await pool.query(
      `INSERT INTO listing_recommendations (user_id, listing_id) VALUES ($1, $2)
       ON CONFLICT (user_id, listing_id) DO NOTHING`,
      [req.auth!.userId, id],
    );
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  '/listings/:id/recommend',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await pool.query(
      'DELETE FROM listing_recommendations WHERE user_id = $1 AND listing_id = $2',
      [req.auth!.userId, id],
    );
    res.json({ ok: true });
  }),
);

router.post(
  '/listings/:id/reactions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const reactionType = z.nativeEnum(ReactionType).parse(req.body.reaction_type);
    await pool.query(
      `INSERT INTO listing_reactions (user_id, listing_id, reaction_type) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, listing_id) DO UPDATE SET reaction_type = EXCLUDED.reaction_type`,
      [req.auth!.userId, id, reactionType],
    );
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  '/listings/:id/reactions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await pool.query('DELETE FROM listing_reactions WHERE user_id = $1 AND listing_id = $2', [req.auth!.userId, id]);
    res.json({ ok: true });
  }),
);

router.get(
  '/listings/:id/comments',
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const { rows } = await pool.query(
      `SELECT c.id, c.listing_id, c.user_id, c.parent_comment_id, c.body, c.created_at,
              u.name AS author_name, u.profile_photo_url AS author_photo
       FROM listing_comments c LEFT JOIN users u ON u.id = c.user_id
       WHERE c.listing_id = $1 AND c.is_deleted = false
       ORDER BY c.created_at ASC`,
      [id],
    );
    res.json({ comments: rows });
  }),
);

router.post(
  '/listings/:id/comments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const body = z.string().min(1).max(2000).parse(req.body.body);
    const parentCommentId = req.body.parent_comment_id ? z.string().uuid().parse(req.body.parent_comment_id) : null;
    const { rows } = await pool.query(
      `INSERT INTO listing_comments (listing_id, user_id, parent_comment_id, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, listing_id, user_id, parent_comment_id, body, created_at`,
      [id, req.auth!.userId, parentCommentId, body],
    );
    res.status(201).json({ comment: rows[0] });
  }),
);

router.post(
  '/listings/:id/report',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const reason = z.string().min(1).max(1000).parse(req.body.reason);
    const { rows } = await pool.query(
      'INSERT INTO listing_reports (user_id, listing_id, reason) VALUES ($1, $2, $3) RETURNING id',
      [req.auth!.userId, id, reason],
    );
    res.status(201).json({ report_id: rows[0].id });
  }),
);

export default router;
