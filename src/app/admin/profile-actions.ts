"use server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { parseInput } from "@/lib/http/parse-input";
import { runAction, type ActionState } from "@/lib/http/run-action";
import { ApiResponse } from "@/lib/http/api-response";
import { SuccessResponse } from "@/lib/http/success-response";
import { logActivity } from "@/lib/activity-log";
import { adminActor } from "@/features/umkm/umkm-service";
import { revalidatePath } from "next/cache";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  avatarUrl: z.string().max(2048).refine(value => !value || /^https?:\/\//.test(value), "URL foto tidak valid."),
  phone: z.string().trim().max(50), bio: z.string().trim().max(500),
});
export async function saveProfileAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { admin, supabase } = await requireAdmin();
    if (admin.authMethod !== "password") throw new ApiResponse(403, "Profil sesi Google mengikuti data akun Google.");
    const input = parseInput(schema, Object.fromEntries(formData));
    let emailPending = Boolean(admin.profile.pendingEmail && input.email === admin.profile.pendingEmail.toLowerCase());
    if (input.email !== admin.email?.toLowerCase() && input.email !== admin.profile.pendingEmail?.toLowerCase()) {
      const { data: registered, error: lookupError } = await createSupabaseAdminClient().from("admins").select("id").eq("email", input.email).neq("id", admin.profile.id).maybeSingle();
      if (lookupError) throw new ApiResponse(500, "Email belum dapat diperiksa.");
      if (registered) throw new ApiResponse(400, "Email ini sudah digunakan atau diizinkan untuk akun admin lain.");
      const { error } = await supabase.auth.updateUser({ email: input.email });
      if (error) throw new ApiResponse(400, "Perubahan email gagal. Pastikan email belum digunakan akun lain.");
      emailPending = true;
    }
    const { error } = await createSupabaseAdminClient().from("admins").update({ full_name: input.fullName, avatar_url: input.avatarUrl, phone: input.phone, bio: input.bio, profile_source: "manual" }).eq("user_id", admin.id);
    if (error) throw new ApiResponse(500, "Profil gagal disimpan.");
    const changes = [
      { field: "fullName", label: "Nama", before: admin.profile.fullName, after: input.fullName },
      { field: "avatarUrl", label: "Foto profil", before: admin.profile.avatarUrl, after: input.avatarUrl },
      { field: "phone", label: "Telepon", before: admin.profile.phone, after: input.phone },
      { field: "bio", label: "Bio", before: admin.profile.bio, after: input.bio },
      ...(emailPending ? [{ field: "pendingEmail", label: "Permintaan email baru", before: admin.email || "", after: input.email }] : []),
    ].filter(change => change.before !== change.after);
    await logActivity({ action: "update", entityType: "profile", entityId: admin.profile.id, entityLabel: input.fullName, actor: adminActor(admin), summary: emailPending ? "Profil diperbarui dan konfirmasi email baru diminta" : "Profil diperbarui", changes });
    revalidatePath("/admin");
    return new SuccessResponse(200, emailPending ? "Profil disimpan. Periksa email lama dan baru untuk mengonfirmasi perubahan email." : "Profil berhasil disimpan.");
  });
}
