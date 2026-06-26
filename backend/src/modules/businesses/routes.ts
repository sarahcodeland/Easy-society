import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { asyncHandler, ApiError } from '../../middleware/errorHandler';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { getGoogleMyBusinessProvider } from '../../services/googleMyBusiness';

const router = Router();

const workingHoursDaySchema = z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() });
const workingHoursSchema = z.record(z.string(), workingHoursDaySchema);

const createBusinessSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(3000).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  contact_number: z.string().max(20).nullable().optional(),
  working_hours: workingHoursSchema.default({}),
  photo_urls: z.array(z.string().url()).max(10).default([]),
});

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = await pool.query('SELECT location_id FROM users WHERE id = $1', [req.auth!.userId]);
    const locationId = me.rows[0]?.location_id;
    if (!locationId) throw new ApiError(400, 'Complete your profile/location first');

    const category = req.query.category ? z.string().parse(req.query.category) : null;
    const { rows } = await pool.query(
      `SELECT b.id, b.name, b.category, b.address, b.contact_number, b.is_verified,
              b.is_google_maps_registered, b.created_at,
              (SELECT photo_url FROM business_photos p WHERE p.business_id = b.id ORDER BY order_index LIMIT 1) AS cover_photo_url,
              COALESCE((SELECT AVG(rating) FROM business_reviews r WHERE r.business_id = b.id), 0) AS avg_rating
       FROM businesses b
       WHERE b.is_deleted = false AND b.location_id = $1 AND ($2::text IS NULL OR b.category = $2::text)
       ORDER BY b.is_verified DESC, b.created_at DESC LIMIT 50`,
      [locationId, category],
    );
    res.json({ businesses: rows });
  }),
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = createBusinessSchema.parse(req.body);
    const me = await pool.query('SELECT location_id FROM users WHERE id = $1', [req.auth!.userId]);
    if (!me.rows[0]?.location_id) throw new ApiError(400, 'Complete your profile/location first');

    const inserted = await pool.query(
      `INSERT INTO businesses (user_id, location_id, name, description, category, address, contact_number, working_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, user_id, location_id, name, description, category, address, contact_number, working_hours,
                 is_google_maps_registered, google_maps_place_id, is_verified, created_at`,
      [req.auth!.userId, me.rows[0].location_id, body.name, body.description ?? null, body.category ?? null,
        body.address ?? null, body.contact_number ?? null, JSON.stringify(body.working_hours)],
    );
    const business = inserted.rows[0];

    if (body.photo_urls.length > 0) {
      const values = body.photo_urls.map((_, i) => `($1, $${i + 2}, ${i})`).join(', ');
      await pool.query(`INSERT INTO business_photos (business_id, photo_url, order_index) VALUES ${values}`,
        [business.id, ...body.photo_urls]);
    }

    res.status(201).json({ business });
  }),
);

router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const business = await pool.query('SELECT * FROM businesses WHERE id = $1 AND is_deleted = false', [id]);
    if (!business.rows[0]) throw new ApiError(404, 'Business not found');

    const photos = await pool.query(
      'SELECT id, photo_url, order_index FROM business_photos WHERE business_id = $1 ORDER BY order_index', [id],
    );
    const reviews = await pool.query(
      `SELECT r.id, r.user_id, r.rating, r.body, r.created_at, u.name AS author_name
       FROM business_reviews r LEFT JOIN users u ON u.id = r.user_id
       WHERE r.business_id = $1 AND r.is_deleted = false ORDER BY r.created_at DESC`,
      [id],
    );
    res.json({ business: business.rows[0], photos: photos.rows, reviews: reviews.rows });
  }),
);

router.post(
  '/:id/reviews',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const rating = z.number().int().min(1).max(5).parse(req.body.rating);
    const body = req.body.body ? z.string().max(2000).parse(req.body.body) : null;
    const { rows } = await pool.query(
      `INSERT INTO business_reviews (business_id, user_id, rating, body) VALUES ($1, $2, $3, $4)
       RETURNING id, business_id, user_id, rating, body, created_at`,
      [id, req.auth!.userId, rating, body],
    );
    res.status(201).json({ review: rows[0] });
  }),
);

// "User confirms with one tap" — this endpoint is that tap. It calls the
// Google My Business provider (stubbed until real OAuth creds exist) and
// stores the resulting place_id so the business becomes discoverable on
// Google Maps without the owner ever touching Google's own console.
router.post(
  '/:id/register-google-maps',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const business = await pool.query('SELECT * FROM businesses WHERE id = $1', [id]);
    if (!business.rows[0]) throw new ApiError(404, 'Business not found');
    if (business.rows[0].user_id !== req.auth!.userId) {
      throw new ApiError(403, 'Only the business owner can register it on Google Maps');
    }

    const photos = await pool.query('SELECT photo_url FROM business_photos WHERE business_id = $1', [id]);

    const result = await getGoogleMyBusinessProvider().createOrSuggestListing(
      {
        name: business.rows[0].name,
        address: business.rows[0].address ?? '',
        contactNumber: business.rows[0].contact_number ?? '',
        category: business.rows[0].category ?? '',
        photoUrls: photos.rows.map((p) => p.photo_url),
        workingHours: business.rows[0].working_hours,
      },
      // In production: the owner's stored Google OAuth access token, refreshed
      // via GOOGLE_MY_BUSINESS_CLIENT_ID/SECRET. Empty for the stub provider.
      '',
    );

    const updated = await pool.query(
      `UPDATE businesses SET is_google_maps_registered = true, google_maps_place_id = $1
       WHERE id = $2 RETURNING *`,
      [result.placeId, id],
    );
    res.json({ business: updated.rows[0], maps_url: result.mapsUrl });
  }),
);

export default router;
