import "server-only";

import { getActiveAdmin } from "@/lib/auth/admin";
import { linkApprovedGoogleAdmin } from "@/lib/auth/google-admin";
import { clearRecoveryGrant, createRecoveryGrant } from "@/lib/auth/password-recovery";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Complete a verified Google or password-recovery callback using fixed local destinations. */
export async function completeAuthCallback(callbackUrl: URL) {
  const code = callbackUrl.searchParams.get("code");
  const supabase = await createSupabaseServerClient();
  const tokenHash = callbackUrl.searchParams.get("token_hash");
  // Supports a recovery email template that links directly with TokenHash too.
  if (tokenHash && callbackUrl.searchParams.get("type") === "recovery") {
    await clearRecoveryGrant();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (!error) {
      await createRecoveryGrant(supabase);
    }

    return new URL("/admin/reset-password", callbackUrl.origin);
  }

  if (code) {
    const flowId = callbackUrl.searchParams.get("sb_flow_id");
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (!error) {
      if ("redirectType" in data && data.redirectType === "recovery") {
        await clearRecoveryGrant();
        await createRecoveryGrant(supabase);

        return new URL("/admin/reset-password", callbackUrl.origin);
      }

      const hasVerifiedGoogleIdentity = await linkApprovedGoogleAdmin(supabase);
      const admin = hasVerifiedGoogleIdentity ? await getActiveAdmin(supabase) : null;
      if (admin?.googleLoginAllowed) {
        return new URL("/admin", callbackUrl.origin);
      }

      await supabase.auth.signOut({ scope: "local" });

      return new URL("/admin/login?error=google_not_allowed", callbackUrl.origin);
    }
  }

  return new URL("/admin/login?error=google_failed", callbackUrl.origin);
}
