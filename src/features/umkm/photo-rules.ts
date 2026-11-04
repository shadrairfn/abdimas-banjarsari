export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS_PER_UPLOAD = 10;
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export const PHOTO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Keep client previews and server uploads subject to the same file restrictions. */
export function getPhotoValidationError(files: File[]): string | null {
  if (files.length === 0) {
    return "Pilih foto yang akan diunggah.";
  }

  if (files.length > MAX_PHOTOS_PER_UPLOAD) {
    return `Maksimal ${MAX_PHOTOS_PER_UPLOAD} gambar sekaligus.`;
  }

  for (const file of files) {
    if (!Object.hasOwn(PHOTO_EXTENSIONS, file.type)) {
      return "Gunakan gambar JPG, PNG, WEBP, atau GIF.";
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      return `Ukuran file ${file.name} melebihi 5MB.`;
    }
  }

  return null;
}
