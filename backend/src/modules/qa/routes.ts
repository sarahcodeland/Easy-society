import { Router } from 'express';
import { z } from 'zod';
import { VisibilityLevel } from '@easysociety/shared';
import { pool } from '../../db/pool';
import { asyncHandler, ApiError } from '../../middleware/errorHandler';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { resolveVisibleScope } from '../../utils/locationScope';
import { attachVisitorTags } from '../../utils/visitorTag';
import { invalidate } from '../../utils/cache';
import { spamGuard } from '../../middleware/spamGuard';

const router = Router();

const createQuestionSchema = z.object({
  title: z.string().min(3).max(300),
  body: z.string().max(5000).nullable().optional(),
  visibility_level: z.nativeEnum(VisibilityLevel).default(VisibilityLevel.AREA),
});

// GET /qa/questions?visibility=area — defaults to the viewer's registered
// area; pass a wider visibility (mandal/district/state/national) to expand,
// per "filter to expand visibility" requirement.
router.get(
  '/questions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filterLevel = z.nativeEnum(VisibilityLevel).default(VisibilityLevel.AREA).parse(req.query.visibility);

    const me = await pool.query('SELECT location_id FROM users WHERE id = $1', [req.auth!.userId]);
    const viewerLocationId = me.rows[0]?.location_id;
    if (!viewerLocationId) throw new ApiError(400, 'Complete your profile/location first');

    const scope = await resolveVisibleScope(viewerLocationId, filterLevel);
    if (scope.locationIds.length === 0 && !scope.includeNational) {
      return res.json({ questions: [] });
    }

    const { rows } = await pool.query(
      `SELECT q.id, q.user_id, q.location_id, q.visibility_level, q.title, q.body, q.created_at,
              u.name AS author_name, u.profile_photo_url AS author_photo,
              COALESCE(v.score, 0) AS vote_score,
              COALESCE(r.count, 0) AS recommendation_count,
              (SELECT count(*) FROM answers a WHERE a.question_id = q.id AND a.is_deleted = false) AS answer_count
       FROM questions q
       LEFT JOIN users u ON u.id = q.user_id
       LEFT JOIN (
         SELECT target_id, SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE -1 END) AS score
         FROM qa_votes WHERE target_type = 'question' GROUP BY target_id
       ) v ON v.target_id = q.id
       LEFT JOIN (
         SELECT target_id, COUNT(*) AS count FROM qa_recommendations
         WHERE target_type = 'question' GROUP BY target_id
       ) r ON r.target_id = q.id
       WHERE q.is_deleted = false
         AND q.user_id NOT IN (SELECT blocked_user_id FROM user_blocks WHERE blocker_user_id = $3)
         AND ((q.location_id = ANY($1::uuid[])) OR ($2 AND q.visibility_level = 'national'))
       ORDER BY q.created_at DESC
       LIMIT 50`,
      [scope.locationIds, scope.includeNational, req.auth!.userId],
    );

    const withTags = await attachVisitorTags(rows, viewerLocationId);
    res.json({ questions: withTags });
  }),
);

router.post(
  '/questions',
  requireAuth,
  spamGuard({ keyPrefix: 'qa-question', windowSeconds: 600, max: 10 }),
  asyncHandler(async (req, res) => {
    const body = createQuestionSchema.parse(req.body);
    const me = await pool.query('SELECT location_id FROM users WHERE id = $1', [req.auth!.userId]);
    if (!me.rows[0]?.location_id) throw new ApiError(400, 'Complete your profile/location first');

    const { rows } = await pool.query(
      `INSERT INTO questions (user_id, location_id, visibility_level, title, body)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, location_id, visibility_level, title, body, created_at`,
      [req.auth!.userId, me.rows[0].location_id, body.visibility_level, body.title, body.body ?? null],
    );
    await invalidate('qa:feed', true);
    res.status(201).json({ question: rows[0] });
  }),
);

router.get(
  '/questions/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const q = await pool.query(
      `SELECT q.*, u.name AS author_name, u.profile_photo_url AS author_photo
       FROM questions q LEFT JOIN users u ON u.id = q.user_id
       WHERE q.id = $1 AND q.is_deleted = false`,
      [id],
    );
    if (!q.rows[0]) throw new ApiError(404, 'Question not found');

    // Most-recommended answers surface to top, ties broken by net votes.
    const answers = await pool.query(
      `SELECT a.id, a.question_id, a.user_id, a.body, a.created_at,
              u.name AS author_name, u.profile_photo_url AS author_photo,
              COALESCE(v.score, 0) AS vote_score,
              COALESCE(r.count, 0) AS recommendation_count
       FROM answers a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN (
         SELECT target_id, SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE -1 END) AS score
         FROM qa_votes WHERE target_type = 'answer' GROUP BY target_id
       ) v ON v.target_id = a.id
       LEFT JOIN (
         SELECT target_id, COUNT(*) AS count FROM qa_recommendations
         WHERE target_type = 'answer' GROUP BY target_id
       ) r ON r.target_id = a.id
       WHERE a.question_id = $1 AND a.is_deleted = false
       ORDER BY recommendation_count DESC, vote_score DESC, a.created_at ASC`,
      [id],
    );

    res.json({ question: q.rows[0], answers: answers.rows });
  }),
);

router.post(
  '/questions/:id/answers',
  requireAuth,
  asyncHandler(async (req, res) => {
    const questionId = z.string().uuid().parse(req.params.id);
    const body = z.string().min(1).max(5000).parse(req.body.body);
    const { rows } = await pool.query(
      `INSERT INTO answers (question_id, user_id, body) VALUES ($1, $2, $3)
       RETURNING id, question_id, user_id, body, created_at`,
      [questionId, req.auth!.userId, body],
    );
    res.status(201).json({ answer: rows[0] });
  }),
);

router.delete(
  '/questions/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const q = await pool.query('SELECT user_id FROM questions WHERE id = $1', [id]);
    if (!q.rows[0]) throw new ApiError(404, 'Question not found');
    if (q.rows[0].user_id !== req.auth!.userId && req.auth!.role === 'user') {
      throw new ApiError(403, 'Not allowed to delete this question');
    }
    await pool.query('UPDATE questions SET is_deleted = true WHERE id = $1', [id]);
    res.json({ ok: true });
  }),
);

router.delete(
  '/answers/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const a = await pool.query('SELECT user_id FROM answers WHERE id = $1', [id]);
    if (!a.rows[0]) throw new ApiError(404, 'Answer not found');
    if (a.rows[0].user_id !== req.auth!.userId && req.auth!.role === 'user') {
      throw new ApiError(403, 'Not allowed to delete this answer');
    }
    await pool.query('UPDATE answers SET is_deleted = true WHERE id = $1', [id]);
    res.json({ ok: true });
  }),
);

const targetSchema = z.object({
  target_id: z.string().uuid(),
  target_type: z.enum(['question', 'answer']),
});

router.post(
  '/votes',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { target_id, target_type } = targetSchema.parse(req.body);
    const vote_type = z.enum(['upvote', 'downvote']).parse(req.body.vote_type);
    await pool.query(
      `INSERT INTO qa_votes (user_id, target_id, target_type, vote_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, target_id, target_type) DO UPDATE SET vote_type = EXCLUDED.vote_type`,
      [req.auth!.userId, target_id, target_type, vote_type],
    );
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  '/votes',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { target_id, target_type } = targetSchema.parse(req.body);
    await pool.query(
      'DELETE FROM qa_votes WHERE user_id = $1 AND target_id = $2 AND target_type = $3',
      [req.auth!.userId, target_id, target_type],
    );
    res.json({ ok: true });
  }),
);

// Separate credibility/genuineness signal, distinct from up/down votes.
router.post(
  '/recommendations',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { target_id, target_type } = targetSchema.parse(req.body);
    await pool.query(
      `INSERT INTO qa_recommendations (user_id, target_id, target_type)
       VALUES ($1, $2, $3) ON CONFLICT (user_id, target_id, target_type) DO NOTHING`,
      [req.auth!.userId, target_id, target_type],
    );
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  '/recommendations',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { target_id, target_type } = targetSchema.parse(req.body);
    await pool.query(
      'DELETE FROM qa_recommendations WHERE user_id = $1 AND target_id = $2 AND target_type = $3',
      [req.auth!.userId, target_id, target_type],
    );
    res.json({ ok: true });
  }),
);

router.post(
  '/reports',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { target_id, target_type } = targetSchema.parse(req.body);
    const reason = z.string().min(1).max(1000).parse(req.body.reason);
    const { rows } = await pool.query(
      `INSERT INTO qa_reports (user_id, target_id, target_type, reason) VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.auth!.userId, target_id, target_type, reason],
    );
    res.status(201).json({ report_id: rows[0].id });
  }),
);

export default router;
