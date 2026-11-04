import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Supabase can generate an OAuth URL even when the provider is disabled.
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" }, cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const settings = await response.json();
    if (!response.ok || settings.external?.google !== true) throw new Error("Google provider unavailable");
  } catch {
    return NextResponse.redirect(new URL("/admin/login?error=google_unavailable", request.url));
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${request.nextUrl.origin}/auth/callback`, scopes: "openid email profile" },
  });
  if (error || !data.url) return NextResponse.redirect(new URL("/admin/login?error=google_unavailable", request.url));
  return NextResponse.redirect(data.url);
}
