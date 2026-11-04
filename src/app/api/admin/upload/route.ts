import { requireAdmin } from "@/lib/auth/admin";
import { asyncHandler } from "@/lib/http/async-handler";
import { sendSuccess, SuccessResponse } from "@/lib/http/success-response";
import { uploadUmkmPhotos } from "@/lib/supabase/storage";

/**
 * Upload UMKM photos. Admin only.
 * @route POST /api/admin/upload (multipart form, field name "files")
 * @throws {ApiResponse} 400 invalid files, 401 not admin
 */
export const POST = asyncHandler(async (request: Request) => {
  const { supabase } = await requireAdmin();

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  const urls = await uploadUmkmPhotos(supabase, files);

  return sendSuccess(new SuccessResponse(201, "Foto berhasil diunggah.", { urls }));
});
