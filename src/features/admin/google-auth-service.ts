import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const PROVIDER_CHECK_TIMEOUT_MS = 10_000;

async function isGoogleProviderAvailable() {
  // Supabase can generate an authorization URL even while the provider is disabled.
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
      cache: "no-store",
      signal: AbortSignal.timeout(PROVIDER_CHECK_TIMEOUT_MS),
    });
    const settings = await response.json();

    return response.ok && settings.external?.google === true;
  } catch {
    return false;
  }
}

/** Start Google OAuth with the shared server client and a fixed application callback. */
export async function getGoogleSignInDestination(origin: string): Promise<string | URL> {
  const unavailableDestination = new URL("/admin/login?error=google_unavailable", origin);
  const isProviderAvailable = await isGoogleProviderAvailable();

  if (!isProviderAvailable) {
    return unavailableDestination;
  }

  const supabase = await createSupabaseServerClient();
  const { data: authorization, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      scopes: "openid email profile",
    },
  });

  if (error || !authorization.url) {
    return unavailableDestination;
  }

  return authorization.url;
}
