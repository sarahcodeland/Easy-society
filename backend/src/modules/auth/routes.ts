import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { pool } from '../../db/pool';
import { asyncHandler, ApiError } from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';
import { redisRateLimit } from '../../middleware/rateLimit';
import { signAuthToken } from '../../middleware/auth';

const router = Router();

const BCRYPT_ROUNDS = 10;

const credentialsSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const profileSchema = z.object({
  name: z.string().min(1).max(120),
  profile_photo_url: z.string().url().nullable().optional(),
  location_id: z.string().uuid(),
  preferred_language: z.string().min(2).max(5).optional(),
});

const USER_FIELDS = `id, email, name, profile_photo_url, location_id, role, is_verified, is_banned, preferred_language, created_at`;

const authRateLimit = redisRateLimit({
  keyPrefix: 'auth',
  windowSeconds: 60,
  max: 10,
  keyFn: (req) => req.ip ?? 'unknown',
});

// POST /auth/register
router.post(
  '/register',
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { email, password } = credentialsSchema.parse(req.body);

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw new ApiError(409, 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING ${USER_FIELDS}`,
      [email, passwordHash, 'New User'],
    );

    const user = rows[0];
    const token = signAuthToken({ userId: user.id, role: user.role });
    res.status(201).json({ token, user, needs_profile: true });
  }),
);

// POST /auth/login
router.post(
  '/login',
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { email, password } = credentialsSchema.parse(req.body);

    const { rows } = await pool.query(
      `SELECT ${USER_FIELDS}, password_hash FROM users WHERE email = $1 AND is_deleted = false`,
      [email],
    );

    const user = rows[0];
    if (!user || !user.password_hash) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (user.is_banned) {
      throw new ApiError(403, 'This account has been banned');
    }

    const needsProfile = !user.location_id;
    delete user.password_hash;

    const token = signAuthToken({ userId: user.id, role: user.role });
    res.json({ token, user, needs_profile: needsProfile });
  }),
);

// PUT /auth/profile — completes signup: name, photo, and registered area.
// location_id must be of type "area" — enforced here since locations is a
// generic self-referencing table with no DB-level type constraint per row.
router.put(
  '/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = profileSchema.parse(req.body);

    const loc = await pool.query('SELECT type FROM locations WHERE id = $1', [body.location_id]);
    if (loc.rows.length === 0 || loc.rows[0].type !== 'area') {
      throw new ApiError(400, 'location_id must reference a location of type "area"');
    }

    const { rows } = await pool.query(
      `UPDATE users SET name = $1, profile_photo_url = $2, location_id = $3,
              preferred_language = COALESCE($5, preferred_language)
       WHERE id = $4
       RETURNING ${USER_FIELDS}`,
      [body.name, body.profile_photo_url ?? null, body.location_id, req.auth!.userId, body.preferred_language ?? null],
    );

    // Auto-join the area's chat group now that the user has a registered area.
    const group = await pool.query('SELECT id FROM chat_groups WHERE location_id = $1', [body.location_id]);
    if (group.rows[0]) {
      await pool.query(
        `INSERT INTO chat_group_members (group_id, user_id) VALUES ($1, $2)
         ON CONFLICT (group_id, user_id) DO NOTHING`,
        [group.rows[0].id, req.auth!.userId],
      );
    }

    res.json({ user: rows[0] });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT ${USER_FIELDS} FROM users WHERE id = $1 AND is_deleted = false`,
      [req.auth!.userId],
    );
    if (!rows[0]) throw new ApiError(404, 'User not found');
    res.json({ user: rows[0] });
  }),
);

export default router;
