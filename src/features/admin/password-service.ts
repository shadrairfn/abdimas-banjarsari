import "server-only";

import { cookies, headers } from "next/headers";
import { z } from "zod";

import { adminActor } from "@/features/umkm/umkm-service";
import { logActivity } from "@/lib/activity-log";
import { clearRecoveryGrant, getRecoveryAdmin } from "@/lib/auth/password-recovery";
import { ApiResponse } from "@/lib/http/api-response";
import { parseInput } from "@/lib/http/parse-input";
import { SuccessResponse } from "@/lib/http/success-response";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PASSWORD_RESET_COOLDOWN_SECONDS = 60;
const PASSWORD_RESET_COOLDOWN_MS = PASSWORD_RESET_COOLDOWN_SECONDS * 1000;

const PASSWORD_RESET_REQUEST_MESSAGE =
  "Jika email terdaftar pada akun aktif dengan kata sandi, tautan pemulihan akan dikirim. Periksa kotak masuk dan folder spam. Buka tautan pada browser yang sama.";
/** Request recovery for an eligible account without revealing email registration to the client. */
export async function requestPasswordReset(formData: FormData) {
  const email = parseInput(
    z.string().trim().toLowerCase().email("Masukkan alamat email yang valid."),
    formData.get("email"),
  );
  if (!isSupabaseConfigured()) {
    throw new ApiResponse(503, "Pemulihan kata sandi belum tersedia.");
  }

  const cookieStore = await cookies();
  const lastRequestAt = Number(cookieStore.get("password_reset_requested")?.value);
  if (Number.isFinite(lastRequestAt) && Date.now() - lastRequestAt < PASSWORD_RESET_COOLDOWN_MS) {
    throw new ApiResponse(429, "Tunggu satu menit sebelum meminta tautan lagi.");
  }

  cookieStore.set("password_reset_requested", String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PASSWORD_RESET_COOLDOWN_SECONDS,
  });
  const databaseClient = createSupabaseAdminClient();
  const { data: account, error } = await databaseClient
    .from("admins")
    .select("user_id")
    .eq("email", email)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    throw new ApiResponse(503, "Pemulihan kata sandi sedang tidak tersedia. Coba lagi nanti.");
  }

  if (account?.user_id) {
    const {
      data: { user },
      error: userError,
    } = await databaseClient.auth.admin.getUserById(account.user_id);
    if (userError) {
      throw new ApiResponse(503, "Pemulihan kata sandi sedang tidak tersedia. Coba lagi nanti.");
    }

    if (user?.identities?.some((identity) => identity.provider === "email")) {
      const requestHeaders = await headers();
      const origin = requestHeaders.get("origin");
      if (!origin || !/^https?:\/\//.test(origin)) {
        throw new ApiResponse(400, "Alamat aplikasi tidak dapat ditentukan. Muat ulang halaman.");
      }

      const supabase = await createSupabaseServerClient();
      const { error: sendError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${new URL(origin).origin}/auth/callback`,
      });
      if (sendError) {
        console.error("Password recovery email failed:", sendError.code);

        throw new ApiResponse(
          sendError.status === 429 ? 429 : 503,
          sendError.status === 429
            ? "Batas pengiriman email tercapai. Coba lagi nanti."
            : "Email pemulihan belum dapat dikirim. Coba lagi nanti atau hubungi pengelola.",
        );
      }
    }
  }

  return new SuccessResponse(200, PASSWORD_RESET_REQUEST_MESSAGE);
}

const passwordResetInputSchema = z
  .object({
    password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(128),
    confirmation: z.string(),
  })
  .refine((value) => value.password === value.confirmation, {
    message: "Konfirmasi kata sandi tidak sama.",
    path: ["confirmation"],
  });
/** Update a password after verifying a signed recovery grant tied to the current session. */
export async function resetPassword(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const admin = await getRecoveryAdmin(supabase);
  if (!admin) {
    throw new ApiResponse(
      403,
      "Tautan pemulihan tidak valid atau sudah kedaluwarsa. Minta tautan baru.",
    );
  }

  const { password } = parseInput(passwordResetInputSchema, Object.fromEntries(formData));
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw new ApiResponse(
      400,
      error.code === "same_password"
        ? "Gunakan kata sandi baru yang berbeda dari sebelumnya."
        : "Kata sandi belum dapat diperbarui. Gunakan minimal 8 karakter dan coba lagi.",
    );
  }

  await logActivity({
    action: "update",
    entityType: "profile",
    entityId: admin.profile.id,
    entityLabel: admin.profileName,
    actor: adminActor(admin),
    summary: "Kata sandi diperbarui melalui tautan pemulihan email",
  });
  await clearRecoveryGrant();
  await supabase.auth.signOut();

  return new SuccessResponse(200, "Kata sandi berhasil diperbarui.");
}
