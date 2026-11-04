import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveAdmin } from "@/lib/auth/admin";
import { linkApprovedGoogleAdmin } from "@/lib/auth/google-admin";
import { logActivity } from "@/lib/activity-log";
import { adminActor } from "@/features/umkm/umkm-service";
import { createRecoveryGrant, clearRecoveryGrant } from "@/lib/auth/password-recovery";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const supabase = await createSupabaseServerClient();
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  // Supports a recovery email template that links directly with TokenHash too.
  if (tokenHash && request.nextUrl.searchParams.get("type") === "recovery") {
    await clearRecoveryGrant();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (!error) await createRecoveryGrant(supabase);
    return NextResponse.redirect(new URL("/admin/reset-password", request.url));
  }
  if (code) {
    const flowId = request.nextUrl.searchParams.get("sb_flow_id");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (!error) {
      if ("redirectType" in data && data.redirectType === "recovery") {
        await clearRecoveryGrant();
        await createRecoveryGrant(supabase);
        return NextResponse.redirect(new URL("/admin/reset-password", request.url));
      }
      const verifiedGoogle = await linkApprovedGoogleAdmin(supabase);
      const admin = verifiedGoogle ? await getActiveAdmin(supabase) : null;
      if (admin?.googleLoginAllowed) {
        await logActivity({ action: "login", entityType: "session", entityId: admin.profile.id, entityLabel: admin.profileName, actor: adminActor(admin), summary: "Masuk melalui Google; nama dan foto profil disinkronkan" });
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      await logActivity({ action: "login_failed", entityType: "session", entityLabel: "Login Google", actor: { type: "system", name: "Akun Google tanpa izin" }, summary: "Email Google tidak diizinkan atau akun nonaktif" });
      await supabase.auth.signOut({ scope: "local" });
      return NextResponse.redirect(new URL("/admin/login?error=google_not_allowed", request.url));
    }
  }
  await logActivity({ action: "login_failed", entityType: "session", entityLabel: "Login Google", actor: { type: "system", name: "Pengunjung" }, summary: "Callback Google tidak dapat diverifikasi" });
  return NextResponse.redirect(new URL("/admin/login?error=google_failed", request.url));
}
