import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { env } from '../../config/env';

// Service-role client: only the backend holds this key, so it can mint
// signed upload URLs scoped to a single object path. Clients upload directly
// to that URL; reads go through Supabase Storage's public URL for the bucket.
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

const ALLOWED_PREFIXES = ['chat', 'status', 'listing', 'business', 'profile', 'qa'] as const;
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

  const { data, error } = await supabase.storage
    .from(env.supabaseStorageBucket)
    .createSignedUploadUrl(objectKey);
  if (error) {
    throw new Error(`Failed to create signed upload URL: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(env.supabaseStorageBucket)
    .getPublicUrl(objectKey);

  return {
    uploadUrl: data.signedUrl,
    objectKey,
    publicUrl: publicUrlData.publicUrl,
  };
}
