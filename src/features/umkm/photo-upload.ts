import { getPhotoValidationError } from "./photo-rules";

interface PhotoUploadOptions {
  endpoint: string;
  files: File[];
  purpose?: "avatar";
}

interface PhotoUploadResponse {
  message?: string;
  data?: { urls?: string[] };
}

/** Upload through the current admin/owner endpoint; authorization stays on the server. */
export async function uploadPhotos({
  endpoint,
  files,
  purpose,
}: PhotoUploadOptions): Promise<string[]> {
  const validationError = getPhotoValidationError(files);

  if (validationError) {
    throw new Error(validationError);
  }

  const formData = new FormData();

  for (const file of files) {
    formData.append("files", file);
  }

  if (purpose) {
    formData.set("purpose", purpose);
  }

  const response = await fetch(endpoint, { method: "POST", body: formData });
  const result = (await response.json()) as PhotoUploadResponse;
  const uploadedUrls = result.data?.urls;
  const hasCompleteResponse = Array.isArray(uploadedUrls) && uploadedUrls.length === files.length;

  if (!response.ok || !hasCompleteResponse) {
    throw new Error(result.message || "Foto belum dapat diunggah. Silakan coba lagi.");
  }

  return uploadedUrls;
}
