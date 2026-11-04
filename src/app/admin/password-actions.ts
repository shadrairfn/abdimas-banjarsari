"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { clearRecoveryGrant, getRecoveryAdmin } from "@/lib/auth/password-recovery";
import { runAction, type ActionState } from "@/lib/http/run-action";
import { parseInput } from "@/lib/http/parse-input";
import { ApiResponse } from "@/lib/http/api-response";
import { SuccessResponse } from "@/lib/http/success-response";
import { logActivity } from "@/lib/activity-log";
import { adminActor } from "@/features/umkm/umkm-service";

const SENT = "Jika email terdaftar pada akun aktif dengan kata sandi, tautan pemulihan akan dikirim. Periksa kotak masuk dan folder spam. Buka tautan pada browser yang sama.";
export async function requestPasswordResetAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const email = parseInput(z.string().trim().toLowerCase().email("Masukkan alamat email yang valid."), formData.get("email"));
    if (!isSupabaseConfigured()) throw new ApiResponse(503, "Pemulihan kata sandi belum tersedia.");
    const store = await cookies();
    const last = Number(store.get("password_reset_requested")?.value);
    if (Number.isFinite(last) && Date.now() - last < 60000) throw new ApiResponse(429, "Tunggu satu menit sebelum meminta tautan lagi.");
    store.set("password_reset_requested", String(Date.now()), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 });
    const db = createSupabaseAdminClient();
    const { data: account, error } = await db.from("admins").select("user_id").eq("email", email).eq("is_active", true).maybeSingle();
    if (error) throw new ApiResponse(503, "Pemulihan kata sandi sedang tidak tersedia. Coba lagi nanti.");
    if (account?.user_id) {
      const { data: { user }, error: userError } = await db.auth.admin.getUserById(account.user_id);
      if (userError) throw new ApiResponse(503, "Pemulihan kata sandi sedang tidak tersedia. Coba lagi nanti.");
      if (user?.identities?.some(identity => identity.provider === "email")) {
        const requestHeaders = await headers();
        const origin = requestHeaders.get("origin");
        if (!origin || !/^https?:\/\//.test(origin)) throw new ApiResponse(400, "Alamat aplikasi tidak dapat ditentukan. Muat ulang halaman.");
        const supabase = await createSupabaseServerClient();
        const { error: sendError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${new URL(origin).origin}/auth/callback` });
        if (sendError) {
          console.error("Password recovery email failed:", sendError.code);
          throw new ApiResponse(sendError.status === 429 ? 429 : 503, sendError.status === 429 ? "Batas pengiriman email tercapai. Coba lagi nanti." : "Email pemulihan belum dapat dikirim. Coba lagi nanti atau hubungi pengelola.");
        }
      }
    }
    await logActivity({ action: "view", entityType: "session", entityLabel: "Pemulihan kata sandi", actor: { type: "system", name: email }, summary: "Tautan pemulihan diminta; status pendaftaran email tidak ditampilkan" });
    return new SuccessResponse(200, SENT);
  });
}

const passwordSchema = z.object({ password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(128), confirmation: z.string() }).refine(value => value.password === value.confirmation, { message: "Konfirmasi kata sandi tidak sama.", path: ["confirmation"] });
export async function resetPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const supabase = await createSupabaseServerClient();
    const admin = await getRecoveryAdmin(supabase);
    if (!admin) throw new ApiResponse(403, "Tautan pemulihan tidak valid atau sudah kedaluwarsa. Minta tautan baru.");
    const { password } = parseInput(passwordSchema, Object.fromEntries(formData));
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new ApiResponse(400, error.code === "same_password" ? "Gunakan kata sandi baru yang berbeda dari sebelumnya." : "Kata sandi belum dapat diperbarui. Gunakan minimal 8 karakter dan coba lagi.");
    await logActivity({ action: "update", entityType: "profile", entityId: admin.profile.id, entityLabel: admin.profileName, actor: adminActor(admin), summary: "Kata sandi diperbarui melalui tautan pemulihan email" });
    await clearRecoveryGrant();
    await supabase.auth.signOut();
    return new SuccessResponse(200, "Kata sandi berhasil diperbarui.");
  });
  if (result.success) redirect("/admin/login?notice=password_reset");
  return result;
}
