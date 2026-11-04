import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ApiResponse } from "@/lib/http/api-response";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Return the logged-in user only if the user is an active admin, otherwise null. */
export async function getActiveAdmin(supabase: SupabaseClient): Promise<(User & { adminRole: "admin" | "superadmin" }) | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("admins")
    .select("user_id,role,email,google_login_allowed")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claims) return null;
  const methods = claims.claims.amr as { method?: string }[] | undefined;
  if (methods?.some(method => method.method === "oauth") && (!data.google_login_allowed || data.email.toLowerCase() !== user.email?.toLowerCase())) return null;
  return { ...user, adminRole: data.role };
}

/**
 * Guard for every admin-only route handler and server action.
 * @throws {ApiResponse} 503 if Supabase is not configured, 401 if the user is not an active admin
 */
export async function requireAdmin() {
  if (!isSupabaseConfigured()) {
    throw new ApiResponse(503, "Supabase belum dikonfigurasi.");
  }

  const supabase = await createSupabaseServerClient();
  const admin = await getActiveAdmin(supabase);

  if (!admin) {
    throw new ApiResponse(401, "Akses admin diperlukan.");
  }

  return { supabase, admin };
}

export async function requireSuperadmin() {
  const context = await requireAdmin();
  if (context.admin.adminRole !== "superadmin") throw new ApiResponse(403, "Hanya Superadmin yang dapat mengelola akun admin.");
  return context;
}
