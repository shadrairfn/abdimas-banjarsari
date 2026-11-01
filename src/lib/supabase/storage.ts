import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiResponse } from "@/lib/http/api-response";

const PHOTO_BUCKET = "umkm-photos";
const MAX_PHOTOS_PER_UPLOAD = 10;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

// Same list as the bucket's allowed_mime_types, the extension comes from the type, not the file name.
const PHOTO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function validatePhoto(file: File) {
  if (!PHOTO_EXTENSIONS[file.type]) {
    throw new ApiResponse(400, "Hanya file gambar JPG, PNG, WEBP, atau GIF yang diperbolehkan.");
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    throw new ApiResponse(400, `Ukuran file ${file.name} melebihi 5MB.`);
  }
}

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
  if (files.length === 0) {
    throw new ApiResponse(400, "Tidak ada file yang diunggah.");
  }

  if (files.length > MAX_PHOTOS_PER_UPLOAD) {
    throw new ApiResponse(400, `Maksimal ${MAX_PHOTOS_PER_UPLOAD} gambar sekaligus.`);
  }

  files.forEach(validatePhoto);

  return Promise.all(files.map((file) => uploadPhoto(supabase, file)));
}
