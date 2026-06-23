import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, type, reference_id, reference_type, is_read, created_at
       FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.auth!.userId],
    );
    res.json({ notifications: rows });
  }),
);

router.post(
  '/:id/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [id, req.auth!.userId]);
    res.json({ ok: true });
  }),
);

router.post(
  '/read-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [req.auth!.userId]);
    res.json({ ok: true });
  }),
);

router.post(
  '/device-tokens',
  requireAuth,
  asyncHandler(async (req, res) => {
    const token = z.string().min(10).parse(req.body.token);
    const platform = z.enum(['android', 'ios']).default('android').parse(req.body.platform);
    await pool.query(
      `INSERT INTO device_tokens (user_id, token, platform) VALUES ($1, $2, $3)
       ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform`,
      [req.auth!.userId, token, platform],
    );
    res.status(201).json({ ok: true });
  }),
);

export default router;
