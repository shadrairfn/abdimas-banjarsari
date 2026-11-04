import { requireOwner } from "@/lib/auth/owner";
import { asyncHandler } from "@/lib/http/async-handler";
import { SuccessResponse, sendSuccess } from "@/lib/http/success-response";
import { uploadUmkmPhotos } from "@/lib/supabase/storage";
import { logActivity } from "@/lib/activity-log";

/**
 * Upload UMKM photos for an owner key.
 * @route POST /api/owner/upload (multipart form, field name "files")
 * @throws {ApiResponse} 400 invalid files, 401 if the key stopped working
 */
export const POST = asyncHandler(async (request: Request) => {
  const { supabase, key } = await requireOwner();

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  const urls = await uploadUmkmPhotos(supabase, files);
  await logActivity({ action: "upload", entityType: "photo", entityId: key.umkm_id, entityLabel: "Foto usaha", actor: { type: "owner", keyId: key.id, keyHint: key.key_hint, name: key.owner_label || "Pemilik" }, summary: `${urls.length} foto diunggah pemilik` });

  return sendSuccess(new SuccessResponse(201, "Foto berhasil diunggah.", { urls }));
});
