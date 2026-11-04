import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getPhotoValidationError, PHOTO_EXTENSIONS } from "@/features/umkm/photo-rules";
import { ApiResponse } from "@/lib/http/api-response";

const PHOTO_BUCKET = "umkm-photos";

function createPhotoPath(file: File) {
  const randomPart = Math.random().toString(36).substring(2, 9);

  return `photos/${Date.now()}-${randomPart}.${PHOTO_EXTENSIONS[file.type]}`;
}

async function uploadPhoto(supabase: SupabaseClient, file: File) {
  const filePath = createPhotoPath(file);

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(filePath, file, { cacheControl: "3600", upsert: false });

  if (error) {
    throw new ApiResponse(500, `Gagal mengunggah foto: ${error.message}`);
  }

  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(filePath).data.publicUrl;
}

/**
 * Upload UMKM photos to Supabase Storage and return their public URLs.
 * Every file is validated before the first upload starts.
 * @throws {ApiResponse} 400 for no file, too many files, wrong type or too large; 500 if storage fails
 */
export async function uploadUmkmPhotos(supabase: SupabaseClient, files: File[]): Promise<string[]> {
  const validationError = getPhotoValidationError(files);

  if (validationError) {
    throw new ApiResponse(400, validationError);
  }

  return Promise.all(files.map((file) => uploadPhoto(supabase, file)));
}
