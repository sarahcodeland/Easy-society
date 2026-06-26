import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '../api/client';

export type UploadPrefix = 'chat' | 'status' | 'listing' | 'business' | 'profile' | 'qa';

// Picks one image and uploads it directly to Supabase Storage via a
// presigned URL — the file bytes never pass through the EasySociety API,
// only the small JSON request to mint the URL does. Returns the public URL
// to store in the relevant content row (listing_photos.photo_url, etc).
export async function pickAndUploadImage(prefix: UploadPrefix): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  const asset = result.assets?.[0];
  if (result.canceled || !asset?.uri) return null;
  const contentType = asset.mimeType ?? 'image/jpeg';

  const { data } = await apiClient.post('/storage/presigned-upload', {
    prefix,
    content_type: contentType,
  });

  await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: { uri: asset.uri, type: contentType, name: asset.fileName ?? 'upload' } as unknown as BodyInit,
  } as RequestInit);

  return data.publicUrl as string;
}
