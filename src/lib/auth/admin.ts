import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ApiResponse } from "@/lib/http/api-response";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { logActivity } from "@/lib/activity-log";
import type { AdminProfile } from "@/features/admin/types";

export type ActiveAdmin = User & { adminRole: "superadmin" | "admin"; googleLoginAllowed: boolean; profileName: string; authMethod: "google" | "password"; profile: AdminProfile };

/** Return the logged-in user only if the user is an active admin, otherwise null. */
export async function getActiveAdmin(supabase: SupabaseClient): Promise<ActiveAdmin | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("admins")
    .select("id,user_id,email,full_name,avatar_url,phone,bio,profile_source,role,google_login_allowed")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claims) return null;
  const methods = claims.claims.amr as { method?: string }[] | undefined;
  const authMethod = methods?.some(method => method.method === "oauth") ? "google" : "password";
  if (authMethod === "google" && (
    !data.google_login_allowed || data.email.toLowerCase() !== user.email?.toLowerCase()
  )) return null;
  // A confirmed email change from a password session must not transfer Google approval.
  if (authMethod === "password" && user.email && data.email.toLowerCase() !== user.email.toLowerCase()) {
    const { error: syncError } = await createSupabaseAdminClient().from("admins").update({ email: user.email.toLowerCase(), google_login_allowed: false }).eq("id", data.id);
    if (syncError) return null;
    await logActivity({ action: "update", entityType: "profile", entityId: data.id, entityLabel: data.full_name, actor: { type: data.role, id: user.id, name: data.full_name }, summary: "Email baru terverifikasi; izin Google perlu disetujui kembali", changes: [{ field: "email", label: "Email", before: data.email, after: user.email }] });
    data.email = user.email.toLowerCase(); data.google_login_allowed = false;
  }
  const googleData = user.identities?.find(identity => identity.provider === "google"
    && identity.identity_data?.email?.toLowerCase() === user.email?.toLowerCase())?.identity_data;
  const googleName = googleData?.full_name ?? googleData?.name;
  const googleAvatar = googleData?.avatar_url ?? googleData?.picture;
  const fullName = authMethod === "google" && typeof googleName === "string" && googleName.trim() ? googleName.trim().slice(0, 120) : data.full_name;
  const avatarUrl = authMethod === "google" && typeof googleAvatar === "string" && /^https:\/\//.test(googleAvatar) ? googleAvatar : data.avatar_url;
  const profile: AdminProfile = { id: data.id, userId: user.id, email: data.email, fullName, role: data.role, avatarUrl, phone: data.phone, bio: data.bio, authMethod, pendingEmail: user.new_email };
  return { ...user, adminRole: data.role, googleLoginAllowed: data.google_login_allowed, profileName: fullName, authMethod, profile };
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
    await logActivity({ action: "access_denied", entityType: "session", entityLabel: "Akses admin", actor: { type: "system", name: "Sesi tanpa akses admin" }, summary: "Permintaan admin ditolak karena sesi tidak aktif atau belum diizinkan" });
    throw new ApiResponse(401, "Akses admin diperlukan.");
  }

  return { supabase, admin };
}

export async function requireSuperadmin() {
  const context = await requireAdmin();
  if (context.admin.adminRole !== "superadmin") {
    await logActivity({ action: "access_denied", entityType: "admin", entityLabel: "Pengelolaan akun", actor: { type: context.admin.adminRole, id: context.admin.id, name: context.admin.profileName }, summary: "Aksi khusus Superadmin ditolak" });
    throw new ApiResponse(403, "Hanya Superadmin yang dapat mengelola akun admin.");
  }
  return context;
}
