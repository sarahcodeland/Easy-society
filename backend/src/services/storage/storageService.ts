import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { env } from '../../config/env';

// Single S3-compatible client works for both AWS S3 and Cloudflare R2 — R2
// just needs a custom endpoint and path-style addressing. Media is never
// proxied through the Node API: clients upload directly to this presigned
// URL, and reads go through the Cloudflare CDN in front of the bucket.
const s3 = new S3Client({
  region: env.s3Region,
  endpoint: env.storageProvider === 'r2' ? env.r2Endpoint : undefined,
  forcePathStyle: env.storageProvider === 'r2',
  credentials: env.s3AccessKeyId
    ? { accessKeyId: env.s3AccessKeyId, secretAccessKey: env.s3SecretAccessKey }
    : undefined,
});

const ALLOWED_PREFIXES = ['chat', 'status', 'listing', 'business', 'profile'] as const;
type AllowedPrefix = (typeof ALLOWED_PREFIXES)[number];

export interface PresignedUpload {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
}

export async function createPresignedUpload(
  prefix: AllowedPrefix,
  userId: string,
  contentType: string,
): Promise<PresignedUpload> {
  if (!ALLOWED_PREFIXES.includes(prefix)) {
    throw new Error(`Invalid storage prefix: ${prefix}`);
  }
  const ext = contentType.split('/')[1] ?? 'bin';
  const objectKey = `${prefix}/${userId}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: env.s3Bucket,
    Key: objectKey,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return {
    uploadUrl,
    objectKey,
    publicUrl: `${env.cdnBaseUrl}/${objectKey}`,
  };
}
