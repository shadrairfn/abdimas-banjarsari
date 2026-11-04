import { adminActor, deleteUmkm } from "@/features/umkm/umkm-service";
import { idSchema } from "@/features/umkm/validation";
import { requireAdmin } from "@/lib/auth/admin";
import { asyncHandler } from "@/lib/http/async-handler";
import { parseInput } from "@/lib/http/parse-input";
import { sendSuccess, SuccessResponse } from "@/lib/http/success-response";

/**
 * Delete one UMKM. Admin only; the deletion is written to the activity log.
 * @route DELETE /api/admin/umkm/:id
 * @throws {ApiResponse} 400 invalid id, 401 not admin, 404 not found
 */
export const DELETE = asyncHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { supabase, admin } = await requireAdmin();
    const id = parseInput(idSchema, (await params).id);

    await deleteUmkm(supabase, adminActor(admin), id);

    return sendSuccess(new SuccessResponse(200, "UMKM berhasil dihapus.", { id }));
  },
);
