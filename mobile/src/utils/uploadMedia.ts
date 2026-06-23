import { Asset, launchImageLibrary } from 'react-native-image-picker';
import { apiClient } from '../api/client';

export type UploadPrefix = 'chat' | 'status' | 'listing' | 'business' | 'profile';

// Picks one image and uploads it directly to S3/R2 via a presigned URL —
// the file bytes never pass through the EasySociety API, only the small
// JSON request to mint the URL does. Returns the CDN-served public URL to
// store in the relevant content row (listing_photos.photo_url, etc).
export async function pickAndUploadImage(prefix: UploadPrefix): Promise<string | null> {
  const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
  const asset: Asset | undefined = result.assets?.[0];
  if (!asset?.uri || !asset.type) return null;

  const { data } = await apiClient.post('/storage/presigned-upload', {
    prefix,
    content_type: asset.type,
  });

  await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': asset.type },
    body: { uri: asset.uri, type: asset.type, name: asset.fileName ?? 'upload' } as unknown as BodyInit_,
  });

  return data.publicUrl as string;
}
