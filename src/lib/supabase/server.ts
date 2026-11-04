import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Create the shared cookie-backed client used for Supabase login, refresh, and logout. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Cookie refresh can run in a Server Component where mutation is unavailable.
        }
      },
    },
  });
}
