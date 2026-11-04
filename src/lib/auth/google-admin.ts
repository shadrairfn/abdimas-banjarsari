import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

/** Bind an approved email only after Supabase has verified the actual Google identity. */
export async function linkApprovedGoogleAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email || !user.email_confirmed_at) return false;
  const email = user.email.toLowerCase();
  const googleIdentity = user.identities?.find(identity => identity.provider === "google"
    && typeof identity.identity_data?.email === "string"
    && identity.identity_data.email.toLowerCase() === email
    && (identity.identity_data.email_verified === true || identity.identity_data.email_verified === "true"));
  if (!googleIdentity) return false;
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const methods = claims?.claims.amr as { method?: string }[] | undefined;
  if (claimsError || !methods?.some(method => method.method === "oauth")) return false;

  const name = googleIdentity.identity_data?.full_name ?? googleIdentity.identity_data?.name;
  const fullName = typeof name === "string" && name.trim().length >= 2 ? name.trim().slice(0, 120) : email.slice(0, 120);
  const { error: linkError } = await createSupabaseAdminClient().from("admins")
    .update({ user_id: user.id, full_name: fullName })
    .eq("email", email).is("user_id", null).in("role", ["admin", "superadmin"])
    .eq("is_active", true).eq("google_login_allowed", true);
  if (linkError) {
    console.error("Google admin linking failed:", linkError.code);
    return false;
  }
  const photo = googleIdentity.identity_data?.avatar_url ?? googleIdentity.identity_data?.picture;
  const avatarUrl = typeof photo === "string" && /^https:\/\//.test(photo) ? photo : "";
  const { error: profileError } = await createSupabaseAdminClient().from("admins")
    .update({ full_name: fullName, avatar_url: avatarUrl, profile_source: "google" })
    .eq("user_id", user.id).eq("email", email).eq("is_active", true).eq("google_login_allowed", true);
  if (profileError) return false;
  return true;
}
