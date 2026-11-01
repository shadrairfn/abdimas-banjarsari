import "server-only";
import { createClient } from "@supabase/supabase-js";
import { ApiResponse } from "@/lib/http/api-response";

export function isServiceRoleConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Supabase client with the service-role key. It bypasses RLS, so use it only on the server
 * for work that needs it (managing Auth users and the admins table).
 * @throws {ApiResponse} 500 if the key is not configured
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new ApiResponse(500, "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di environment server.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
