import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { asyncHandler, ApiError } from '../../middleware/errorHandler';
import { cached } from '../../utils/cache';
import { geocodePlaceId } from '../../services/googleMaps';

const router = Router();

// GET /locations/children?parent_id=&type=state
// Used by the cascading state -> district -> city/village -> mandal -> area
// pickers on signup. Top-level call omits parent_id to list states.
router.get(
  '/children',
  asyncHandler(async (req, res) => {
    const parentId = req.query.parent_id ? z.string().uuid().parse(req.query.parent_id) : null;
    const cacheKey = `locations:children:${parentId ?? 'root'}`;
    const rows = await cached(cacheKey, 3600, async () => {
      const result = await pool.query(
        parentId
          ? 'SELECT id, name, type, parent_id, lat, lng FROM locations WHERE parent_id = $1 ORDER BY name'
          : 'SELECT id, name, type, parent_id, lat, lng FROM locations WHERE parent_id IS NULL ORDER BY name',
        parentId ? [parentId] : [],
      );
      return result.rows;
    });
    res.json({ locations: rows });
  }),
);

// GET /locations/search?q=kukatpally&type=area — typeahead for onboarding.
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = z.string().min(1).parse(req.query.q);
    const type = req.query.type ? z.string().parse(req.query.type) : null;
    const { rows } = await pool.query(
      `SELECT id, name, type, parent_id, lat, lng FROM locations
       WHERE name ILIKE $1 ${type ? 'AND type = $2' : ''}
       ORDER BY name LIMIT 20`,
      type ? [`%${q}%`, type] : [`%${q}%`],
    );
    res.json({ locations: rows });
  }),
);

// GET /locations/resolve-place?place_id=ChIJ... — resolves a Google place_id to the
// app's location hierarchy by fuzzy-matching each level (state→district→city→mandal→area)
// against the DB. Returns null for levels not found so the client can fallback to cascade.
router.get(
  '/resolve-place',
  asyncHandler(async (req, res) => {
    const placeId = z.string().min(1).parse(req.query.place_id);
    const geo = await geocodePlaceId(placeId);

    async function findByName(name: string | null, type: string, parentId?: string | null) {
      if (!name) return null;
      const params: unknown[] = [type, `%${name}%`];
      let sql =
        'SELECT id, name, type, parent_id, lat, lng FROM locations WHERE type = $1 AND name ILIKE $2';
      if (parentId !== undefined) {
        sql += ' AND ($3::uuid IS NULL OR parent_id = $3)';
        params.push(parentId);
      }
      sql += ' LIMIT 1';
      const { rows } = await pool.query(sql, params);
      return rows[0] ?? null;
    }

    const state = await findByName(geo.state, 'state');
    const district = await findByName(geo.district, 'district', state?.id ?? null);
    const city = await findByName(geo.city, 'city', district?.id ?? null);
    const mandal = await findByName(geo.mandal, 'mandal', city?.id ?? district?.id ?? null);
    const area = await findByName(geo.area, 'area', mandal?.id ?? null);

    res.json({
      resolved: { state, district, city, mandal, area },
      raw: geo,
    });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const { rows } = await pool.query(
      'SELECT id, name, type, parent_id, lat, lng FROM locations WHERE id = $1',
      [id],
    );
    if (!rows[0]) throw new ApiError(404, 'Location not found');
    res.json({ location: rows[0] });
  }),
);

// GET /locations/:id/ancestry — full breadcrumb, e.g. for "Visitor —
// Kukatpally, Hyderabad" label composition on the client.
router.get(
  '/:id/ancestry',
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const { rows } = await pool.query(
      `WITH RECURSIVE chain AS (
         SELECT id, name, type, parent_id, 0 AS depth FROM locations WHERE id = $1
         UNION ALL
         SELECT l.id, l.name, l.type, l.parent_id, c.depth + 1
         FROM locations l JOIN chain c ON l.id = c.parent_id
       )
       SELECT id, name, type, parent_id FROM chain ORDER BY depth DESC`,
      [id],
    );
    res.json({ ancestry: rows });
  }),
);

export default router;
