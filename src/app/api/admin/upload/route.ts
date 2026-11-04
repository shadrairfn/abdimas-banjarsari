import { requireAdmin } from "@/lib/auth/admin";
import { asyncHandler } from "@/lib/http/async-handler";
import { SuccessResponse, sendSuccess } from "@/lib/http/success-response";
import { uploadUmkmPhotos } from "@/lib/supabase/storage";
import { logActivity } from "@/lib/activity-log";
import { adminActor } from "@/features/umkm/umkm-service";

/**
 * Upload UMKM photos. Admin only.
 * @route POST /api/admin/upload (multipart form, field name "files")
 * @throws {ApiResponse} 400 invalid files, 401 not admin
 */
export const POST = asyncHandler(async (request: Request) => {
  const { supabase, admin } = await requireAdmin();

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  const urls = await uploadUmkmPhotos(supabase, files);
  await logActivity({ action: "upload", entityType: formData.get("purpose") === "avatar" ? "profile" : "photo", entityLabel: formData.get("purpose") === "avatar" ? "Foto profil" : "Foto usaha", actor: adminActor(admin), summary: `${urls.length} foto diunggah` });

  return sendSuccess(new SuccessResponse(201, "Foto berhasil diunggah.", { urls }));
});
