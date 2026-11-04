import "server-only";

import { signInSchema } from "@/features/umkm/validation";
import { getActiveAdmin } from "@/lib/auth/admin";
import { ApiResponse } from "@/lib/http/api-response";
import { parseInput } from "@/lib/http/parse-input";
import { SuccessResponse } from "@/lib/http/success-response";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** @throws {ApiResponse} 401 if the credentials are wrong or the account is not an active admin */
export async function signInWithPassword(formData: FormData) {
  if (!isSupabaseConfigured()) {
    throw new ApiResponse(503, "Lengkapi environment Supabase terlebih dahulu.");
  }

  const { email, password } = parseInput(signInSchema, Object.fromEntries(formData));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new ApiResponse(401, "Email atau kata sandi tidak valid.");
  }

  const admin = await getActiveAdmin(supabase);

  if (!admin) {
    await supabase.auth.signOut();

    throw new ApiResponse(403, "Akun ini tidak memiliki akses admin aktif.");
  }

  return new SuccessResponse(200, "Berhasil masuk.");
}
/** Log the current admin out through the shared Supabase session. */
export async function signOutAdmin() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
