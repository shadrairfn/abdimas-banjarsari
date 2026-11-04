import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getActiveAdmin } from "./admin";

const RECOVERY_GRANT_COOKIE_NAME = "admin_password_recovery";
const RECOVERY_GRANT_TTL_SECONDS = 20 * 60;

function signRecoveryGrant(value: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Recovery signing key unavailable");
  }

  return createHmac("sha256", secret).update(`password-recovery:${value}`).digest("hex");
}
/** Delete the temporary signed password-recovery authorization cookie. */
export async function clearRecoveryGrant() {
  (await cookies()).delete(RECOVERY_GRANT_COOKIE_NAME);
}

/** Called only after Supabase verified a recovery token or recovery PKCE code. */
export async function createRecoveryGrant(supabase: SupabaseClient) {
  const admin = await getActiveAdmin(supabase);
  if (
    !admin ||
    admin.authMethod !== "password" ||
    !admin.identities?.some((identity) => identity.provider === "email")
  ) {
    return false;
  }

  const { data, error } = await supabase.auth.getClaims();
  const sessionId = data?.claims.session_id;
  if (error || typeof sessionId !== "string") {
    return false;
  }

  const payload = `${admin.id}.${sessionId}.${Math.floor(Date.now() / 1000) + RECOVERY_GRANT_TTL_SECONDS}`;
  (await cookies()).set(RECOVERY_GRANT_COOKIE_NAME, `${payload}.${signRecoveryGrant(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RECOVERY_GRANT_TTL_SECONDS,
  });

  return true;
}

/** Verify recovery expiry, signature, account status, and current session binding. */
export async function getRecoveryAdmin(supabase: SupabaseClient) {
  const storedGrant = (await cookies()).get(RECOVERY_GRANT_COOKIE_NAME)?.value;
  if (!storedGrant) {
    return null;
  }

  const grantParts = storedGrant.split(".");
  if (grantParts.length !== 4) {
    return null;
  }

  const [userId, sessionId, expires, providedSignature] = grantParts;
  if (!Number.isFinite(Number(expires)) || Number(expires) <= Date.now() / 1000) {
    return null;
  }

  const expected = Buffer.from(signRecoveryGrant(`${userId}.${sessionId}.${expires}`));
  const actual = Buffer.from(providedSignature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  const admin = await getActiveAdmin(supabase);
  if (
    !admin ||
    admin.id !== userId ||
    admin.authMethod !== "password" ||
    !admin.identities?.some((identity) => identity.provider === "email")
  ) {
    return null;
  }

  const { data, error } = await supabase.auth.getClaims();

  return !error && data?.claims.session_id === sessionId ? admin : null;
}
