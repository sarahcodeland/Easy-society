import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { asyncHandler } from '../../middleware/errorHandler';
import { optionalAuth } from '../../middleware/auth';
import { getAncestry } from '../../utils/locationScope';

const router = Router();

// Read-only — schemes are sourced exclusively from myscheme.gov.in / official
// APIs via the sync job (see services/schemes/syncJob.ts), never user-edited.
// GET /schemes?language=te — national schemes plus ones scoped to the
// viewer's state/district if they're logged in with a registered location.
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const language = req.query.language ? z.string().parse(req.query.language) : 'en';

    let locationIds: string[] = [];
    if (req.auth) {
      const me = await pool.query('SELECT location_id FROM users WHERE id = $1', [req.auth.userId]);
      if (me.rows[0]?.location_id) {
        const ancestry = await getAncestry(me.rows[0].location_id);
        locationIds = [ancestry.state_id, ancestry.district_id].filter(Boolean) as string[];
      }
    }

    const { rows } = await pool.query(
      `SELECT id, title, description, source_url, language, location_id, last_synced_at, created_at
       FROM schemes
       WHERE language = $1 AND (location_id IS NULL OR location_id = ANY($2::uuid[]))
       ORDER BY location_id IS NULL, last_synced_at DESC NULLS LAST
       LIMIT 100`,
      [language, locationIds],
    );
    res.json({ schemes: rows });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const { rows } = await pool.query('SELECT * FROM schemes WHERE id = $1', [id]);
    res.json({ scheme: rows[0] ?? null });
  }),
);

export default router;
