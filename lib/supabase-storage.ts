import { createClient } from '@/lib/supabase';

/**
 * Supabase Storage helpers for delivery file uploads
 */

export interface UploadResult {
  path: string;
  error?: string;
}

/**
 * Upload a delivery file to private storage
 * Path format: deliveries/{agreementId}/{version}_{timestamp}_{filename}
 */
export async function uploadDelivery(
  agreementId: string,
  file: File,
  version: number
): Promise<UploadResult> {
  try {
    const supabase = createClient();
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `deliveries/${agreementId}/${version}_${timestamp}_${sanitizedFilename}`;

    const { error } = await supabase.storage
      .from('deliveries')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { path: '', error: error.message };
    }

    return { path };
  } catch (error: any) {
    return { path: '', error: error.message || 'Upload failed' };
  }
}

/**
 * Create a signed URL for downloading a delivery file
 * Signed URLs expire after the specified duration (default 1 hour)
 */
export async function createSignedDownloadUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<{ url: string | null; error?: string }> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase.storage
      .from('deliveries')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      return { url: null, error: error.message };
    }

    return { url: data.signedUrl };
  } catch (error: any) {
    return { url: null, error: error.message || 'Failed to create signed URL' };
  }
}
