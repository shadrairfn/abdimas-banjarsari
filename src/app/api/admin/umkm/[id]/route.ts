import { idSchema } from "@/features/umkm/validation";
import { requireAdmin } from "@/lib/auth/admin";
import { ApiResponse } from "@/lib/http/api-response";
import { asyncHandler } from "@/lib/http/async-handler";
import { parseInput } from "@/lib/http/parse-input";
import { SuccessResponse, sendSuccess } from "@/lib/http/success-response";
import { revalidateUmkmPages } from "@/lib/revalidate";

/**
 * Delete one UMKM. Admin only.
 * @route DELETE /api/admin/umkm/:id
 * @throws {ApiResponse} 400 invalid id, 401 not admin, 404 not found
 */
export const DELETE = asyncHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { supabase } = await requireAdmin();
    const id = parseInput(idSchema, (await params).id);

    const { data, error } = await supabase
      .from("umkm")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new ApiResponse(500, `UMKM gagal dihapus: ${error.message}`);
    }

    if (!data) {
      throw new ApiResponse(404, "UMKM tidak ditemukan.");
    }

    revalidateUmkmPages(id);

    return sendSuccess(new SuccessResponse(200, "UMKM berhasil dihapus.", { id }));
  },
);
