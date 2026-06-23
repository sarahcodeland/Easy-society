import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { asyncHandler, ApiError } from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';
import { redisRateLimit } from '../../middleware/rateLimit';
import { getOtpProvider } from '../../services/otp';
import { generateOtp, storeOtp, verifyOtp } from '../../services/otp/otpStore';
import { signAuthToken } from '../../middleware/auth';

const router = Router();

const phoneSchema = z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number');

const requestOtpSchema = z.object({ phone_number: phoneSchema });
const verifyOtpSchema = z.object({ phone_number: phoneSchema, otp: z.string().length(6) });
const profileSchema = z.object({
  name: z.string().min(1).max(120),
  profile_photo_url: z.string().url().nullable().optional(),
  location_id: z.string().uuid(), // must resolve to a location of type "area"
  preferred_language: z.string().min(2).max(5).optional(),
});

// POST /auth/otp/request
router.post(
  '/otp/request',
  redisRateLimit({ keyPrefix: 'otp-request', windowSeconds: 60, max: 3, keyFn: (req) => req.body?.phone_number ?? req.ip ?? 'unknown' }),
  asyncHandler(async (req, res) => {
    const { phone_number } = requestOtpSchema.parse(req.body);
    const otp = generateOtp();
    await storeOtp(phone_number, otp);
    await getOtpProvider().sendOtp(phone_number, otp);
    res.json({ message: 'OTP sent' });
  }),
);

// POST /auth/otp/verify
// Returns { token, user, needs_profile } — needs_profile=true means the
// client must call PUT /auth/profile next (signup flow), per "Profile
// created + location verified on signup".
router.post(
  '/otp/verify',
  redisRateLimit({ keyPrefix: 'otp-verify', windowSeconds: 60, max: 10, keyFn: (req) => req.body?.phone_number ?? req.ip ?? 'unknown' }),
  asyncHandler(async (req, res) => {
    const { phone_number, otp } = verifyOtpSchema.parse(req.body);
    const ok = await verifyOtp(phone_number, otp);
    if (!ok) {
      throw new ApiError(401, 'Invalid or expired OTP');
    }

    const { rows } = await pool.query(
      `SELECT id, phone_number, name, profile_photo_url, location_id, role, is_verified, is_banned, preferred_language, created_at
       FROM users WHERE phone_number = $1 AND is_deleted = false`,
      [phone_number],
    );

    let user = rows[0];
    let needsProfile = false;

    if (!user) {
      const inserted = await pool.query(
        `INSERT INTO users (phone_number, name) VALUES ($1, $2)
         RETURNING id, phone_number, name, profile_photo_url, location_id, role, is_verified, is_banned, preferred_language, created_at`,
        [phone_number, 'New User'],
      );
      user = inserted.rows[0];
      needsProfile = true;
    } else if (!user.location_id) {
      needsProfile = true;
    }

    if (user.is_banned) {
      throw new ApiError(403, 'This account has been banned');
    }

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
       RETURNING id, phone_number, name, profile_photo_url, location_id, role, is_verified, preferred_language, created_at`,
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
      `SELECT id, phone_number, name, profile_photo_url, location_id, role, is_verified, preferred_language, created_at
       FROM users WHERE id = $1 AND is_deleted = false`,
      [req.auth!.userId],
    );
    if (!rows[0]) throw new ApiError(404, 'User not found');
    res.json({ user: rows[0] });
  }),
);

export default router;
