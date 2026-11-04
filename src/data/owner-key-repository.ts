import "server-only";
import { ownerKeyStatus, type OwnerKeySummary } from "@/features/owner/types";
import { ApiResponse } from "@/lib/http/api-response";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const KEY_COLUMNS = "id,key_hint,umkm_id,owner_label,expires_at,revoked_at,last_used_at,created_at,umkm(name)";

export interface OwnerKeyRow {
  id: string;
  key_hint: string;
  umkm_id: string | null;
  owner_label: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
  umkm?: { name: string } | { name: string }[] | null;
}

export function toOwnerKeySummary(row: OwnerKeyRow): OwnerKeySummary {
  const relation = Array.isArray(row.umkm) ? row.umkm[0] : row.umkm;

  return {
    id: row.id,
    hint: row.key_hint,
    umkmId: row.umkm_id,
    umkmName: relation?.name ?? "",
    ownerLabel: row.owner_label ?? "",
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    status: ownerKeyStatus({ revokedAt: row.revoked_at, expiresAt: row.expires_at, lastUsedAt: row.last_used_at }),
  };
}

export interface OwnerKeyListResult {
  items: OwnerKeySummary[];
  error?: string;
}

/** Every owner key, newest first, read with the admin's own session so row-level security applies. */
export async function listOwnerKeys(): Promise<OwnerKeyListResult> {
  if (!isSupabaseConfigured()) return { items: [] };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("owner_keys")
    .select(KEY_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) return { items: [], error: `Kunci akses gagal dimuat: ${error.message}` };

  return { items: (data as unknown as OwnerKeyRow[]).map(toOwnerKeySummary) };
}

/** @throws {ApiResponse} 404 if the key does not exist */
export async function getOwnerKeyById(id: string): Promise<OwnerKeyRow> {
  const { data, error } = await createSupabaseAdminClient()
    .from("owner_keys")
    .select(KEY_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new ApiResponse(500, `Kunci gagal dimuat: ${error.message}`);
  if (!data) throw new ApiResponse(404, "Kunci tidak ditemukan.");

  return data as unknown as OwnerKeyRow;
}

/** The key that matches a hash, or null. Revoked and expired keys are still returned; the caller decides. */
export async function findOwnerKeyByHash(hash: string): Promise<OwnerKeyRow | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("owner_keys")
    .select(KEY_COLUMNS)
    .eq("key_hash", hash)
    .maybeSingle();

  if (error) throw new ApiResponse(500, `Kunci gagal diperiksa: ${error.message}`);

  return (data as unknown as OwnerKeyRow | null) ?? null;
}
