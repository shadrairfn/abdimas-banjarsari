import "server-only";
import { ApiResponse } from "@/lib/http/api-response";
import { createSupabaseAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin-client";

export interface AdminUser {
  id: string;
  userId: string | null;
  email: string;
  fullName: string;
  isActive: boolean;
  role: "superadmin" | "admin";
  googleLoginAllowed: boolean;
  createdAt?: string;
}

/**
 * List every admin account, oldest first.
 * Returns an empty list when the service-role key is not configured (local read-only mode).
 * @throws {ApiResponse} 500 if the database query fails
 */
export async function listAdmins(): Promise<AdminUser[]> {
  if (!isServiceRoleConfigured()) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admins")
    .select("id, user_id, email, full_name, is_active, role, google_login_allowed, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw new ApiResponse(500, `Gagal memuat daftar admin: ${error.message}`);
  }

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    isActive: row.is_active,
    role: row.role,
    googleLoginAllowed: row.google_login_allowed,
    createdAt: row.created_at,
  }));
}
