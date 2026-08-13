import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function getActiveAdmin(supabase: SupabaseClient): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return user;
}
