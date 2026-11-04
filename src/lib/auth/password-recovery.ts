import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveAdmin } from "./admin";

const COOKIE = "admin_password_recovery";
const TTL = 20 * 60;
function signature(value: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Recovery signing key unavailable");
  return createHmac("sha256", secret).update(`password-recovery:${value}`).digest("hex");
}
export async function clearRecoveryGrant() { (await cookies()).delete(COOKIE); }

/** Called only after Supabase verified a recovery token or recovery PKCE code. */
export async function createRecoveryGrant(supabase: SupabaseClient) {
  const admin = await getActiveAdmin(supabase);
  if (!admin || admin.authMethod !== "password" || !admin.identities?.some(identity => identity.provider === "email")) return false;
  const { data, error } = await supabase.auth.getClaims();
  const sessionId = data?.claims.session_id;
  if (error || typeof sessionId !== "string") return false;
  const payload = `${admin.id}.${sessionId}.${Math.floor(Date.now() / 1000) + TTL}`;
  (await cookies()).set(COOKIE, `${payload}.${signature(payload)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL });
  return true;
}

export async function getRecoveryAdmin(supabase: SupabaseClient) {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [userId, sessionId, expires, supplied] = parts;
  if (!Number.isFinite(Number(expires)) || Number(expires) <= Date.now() / 1000) return null;
  const expected = Buffer.from(signature(`${userId}.${sessionId}.${expires}`));
  const actual = Buffer.from(supplied);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  const admin = await getActiveAdmin(supabase);
  if (!admin || admin.id !== userId || admin.authMethod !== "password" || !admin.identities?.some(identity => identity.provider === "email")) return null;
  const { data, error } = await supabase.auth.getClaims();
  return !error && data?.claims.session_id === sessionId ? admin : null;
}
