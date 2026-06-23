import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { asyncHandler, ApiError } from '../../middleware/errorHandler';
import { cached } from '../../utils/cache';

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
