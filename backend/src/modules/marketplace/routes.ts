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
  details: z.record(z.any()).optional(),
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
              loc.name AS location_label,
              COALESCE(r.count, 0) AS recommendation_count,
              EXISTS(SELECT 1 FROM saved_listings sl WHERE sl.listing_id = l.id AND sl.user_id = $5) AS is_saved,
              (SELECT photo_url FROM listing_photos p WHERE p.listing_id = l.id ORDER BY order_index LIMIT 1) AS cover_photo_url
       FROM listings l
       LEFT JOIN users u ON u.id = l.user_id
       LEFT JOIN locations loc ON loc.id = l.location_id
       LEFT JOIN (
         SELECT listing_id, COUNT(*) AS count FROM listing_recommendations GROUP BY listing_id
       ) r ON r.listing_id = l.id
       WHERE l.is_deleted = false AND l.is_active = true
         AND l.user_id NOT IN (SELECT blocked_user_id FROM user_blocks WHERE blocker_user_id = $3)
         AND (l.category = $4 OR $4 IS NULL)
         AND ((l.location_id = ANY($1::uuid[])) OR ($2 AND l.visibility_level = 'national'))
       ORDER BY l.created_at DESC
       LIMIT 50`,
      [scope.locationIds, scope.includeNational, req.auth!.userId, category ?? null, req.auth!.userId],
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

    const d = body.details ?? {};
    if (body.category === ListingCategory.BUY_SELL) {
      await pool.query(
        `INSERT INTO buy_sell_details (listing_id, subcategory, brand, model, year, condition, price_type, extra_details)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [listing.id, d.subcategory ?? null, d.brand ?? null, d.model ?? null,
          d.year ?? null, d.condition ?? null, d.price_type ?? 'fixed', d.extra_details ?? {}],
      );
    } else if (body.category === ListingCategory.RENT) {
      await pool.query(
        `INSERT INTO rent_details (listing_id, property_type, bedrooms, furnishing, deposit_amount, amenities, available_from, preferred_tenant)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [listing.id, d.property_type ?? null, d.bedrooms ?? null, d.furnishing ?? null,
          d.deposit_amount ?? null, d.amenities ?? [], d.available_from ?? null, d.preferred_tenant ?? 'any'],
      );
    } else if (body.category === ListingCategory.SERVICES) {
      await pool.query(
        `INSERT INTO service_details (listing_id, service_type, experience_years, availability, area_coverage, price_type)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [listing.id, d.service_type ?? null, d.experience_years ?? null,
          d.availability ?? null, d.area_coverage ?? null, d.price_type ?? null],
      );
    } else if (body.category === ListingCategory.JOBS) {
      await pool.query(
        `INSERT INTO job_details (listing_id, company_name, job_type, experience_level, salary_min, salary_max, salary_type, is_urgent, openings, skills_required, gender_preference)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [listing.id, d.company_name ?? null, d.job_type ?? null, d.experience_level ?? null,
          d.salary_min ?? null, d.salary_max ?? null, d.salary_type ?? 'monthly',
          d.is_urgent ?? false, d.openings ?? 1, d.skills_required ?? [], d.gender_preference ?? 'any'],
      );
    } else if (body.category === ListingCategory.BUSINESSES) {
      await pool.query(
        `INSERT INTO business_listing_details (listing_id, business_name, business_category, address, working_hours, website, amenities, established_year)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [listing.id, d.business_name ?? body.title, d.business_category ?? null,
          d.address ?? null, d.working_hours ?? {}, d.website ?? null,
          d.amenities ?? [], d.established_year ?? null],
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

router.post(
  '/listings/:id/save',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await pool.query(
      `INSERT INTO saved_listings (user_id, listing_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.auth!.userId, id],
    );
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  '/listings/:id/save',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await pool.query(
      'DELETE FROM saved_listings WHERE user_id = $1 AND listing_id = $2',
      [req.auth!.userId, id],
    );
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
