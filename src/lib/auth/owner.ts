import "server-only";

import { headers } from "next/headers";

import { findOwnerKeyByHash, getOwnerKeyById, type OwnerKeyRow } from "@/data/owner-key-repository";
import { ownerKeyStatus } from "@/features/owner/types";
import { ApiResponse } from "@/lib/http/api-response";
import { hashKey, normalizeKey } from "@/lib/owner/key";
import { createOwnerSession, readOwnerSessionKeyId } from "@/lib/owner/session";
import { createSupabaseAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin-client";

const MAX_FAILED_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MINUTES = 15;
const INVALID_KEY_MESSAGE = "Kunci tidak dikenali, sudah dicabut, atau kedaluwarsa.";

function isUsable(row: OwnerKeyRow) {
  const status = ownerKeyStatus({
    revokedAt: row.revoked_at,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
  });

  return status === "active" || status === "pending";
}

async function clientIp() {
  const requestHeaders = await headers();

  return (requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip") ?? "unknown")
    .split(",")[0]
    .trim();
}

/** @throws {ApiResponse} 429 after too many wrong keys from one address */
async function assertNotRateLimited(ip: string) {
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count } = await createSupabaseAdminClient()
    .from("owner_key_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);

  if ((count ?? 0) >= MAX_FAILED_ATTEMPTS) {
    throw new ApiResponse(
      429,
      `Terlalu banyak percobaan. Coba lagi dalam ${ATTEMPT_WINDOW_MINUTES} menit.`,
    );
  }
}

/**
 * Check a key typed by an owner and, when it is valid, start a session for it.
 * @throws {ApiResponse} 503 without the service-role key, 429 when rate limited, 401 for a wrong key
 */
export async function unlockWithKey(rawKey: string) {
  if (!isServiceRoleConfigured()) {
    throw new ApiResponse(
      503,
      "Akses pemilik belum dikonfigurasi: SUPABASE_SERVICE_ROLE_KEY belum diisi.",
    );
  }

  const ip = await clientIp();
  await assertNotRateLimited(ip);

  const row = await findOwnerKeyByHash(hashKey(normalizeKey(rawKey)));

  if (!row || !isUsable(row)) {
    await createSupabaseAdminClient().from("owner_key_attempts").insert({ ip });

    throw new ApiResponse(401, INVALID_KEY_MESSAGE);
  }

  await createSupabaseAdminClient()
    .from("owner_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);
  await createOwnerSession(row.id);
}

/** The owner key of the current session, or null when there is no session or the key stopped working. */
export async function getOwnerKey(): Promise<OwnerKeyRow | null> {
  if (!isServiceRoleConfigured()) {
    return null;
  }

  const keyId = await readOwnerSessionKeyId();
  if (!keyId) {
    return null;
  }

  try {
    const row = await getOwnerKeyById(keyId);

    return isUsable(row) ? row : null;
  } catch {
    return null;
  }
}

/**
 * Guard for every owner-only server action and route handler.
 * @throws {ApiResponse} 401 if the session is missing or its key was revoked or expired
 */
export async function requireOwner() {
  const key = await getOwnerKey();

  if (!key) {
    throw new ApiResponse(401, "Sesi pemilik berakhir. Masukkan kunci akses lagi.");
  }

  return { key, supabase: createSupabaseAdminClient() };
}
