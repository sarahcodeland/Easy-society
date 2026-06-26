import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { createPresignedUpload } from '../../services/storage/storageService';

const router = Router();

const presignSchema = z.object({
  prefix: z.enum(['chat', 'status', 'listing', 'business', 'profile', 'qa']),
  content_type: z.string().regex(/^(image|video|audio)\/[a-zA-Z0-9.+-]+$/),
});

// POST /storage/presigned-upload — clients call this first, PUT the file
// bytes directly to the returned uploadUrl (a Supabase Storage signed upload
// URL), then use publicUrl when creating the message/status/listing/etc.
router.post(
  '/presigned-upload',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = presignSchema.parse(req.body);
    const result = await createPresignedUpload(body.prefix, req.auth!.userId, body.content_type);
    res.json(result);
  }),
);

export default router;
