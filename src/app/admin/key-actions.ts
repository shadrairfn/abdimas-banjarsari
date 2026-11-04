"use server";

import { getOwnerKeyById } from "@/data/owner-key-repository";
import type { OwnerKeyStatus } from "@/features/owner/types";
import { idSchema, ownerKeyInputSchema } from "@/features/umkm/validation";
import { logActivity } from "@/lib/activity-log";
import { adminActor } from "@/features/umkm/umkm-service";
import { requireAdmin } from "@/lib/auth/admin";
import { ApiResponse } from "@/lib/http/api-response";
import { parseInput } from "@/lib/http/parse-input";
import { runActionWithData, type DataActionState } from "@/lib/http/run-action";
import { SuccessResponse } from "@/lib/http/success-response";
import { assertValidCustomKey, formatKey, generateKey, hashKey, keyHint, normalizeKey } from "@/lib/owner/key";
import { maskedKey } from "@/features/owner/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_KEY_ATTEMPTS = 3;
const UNIQUE_VIOLATION = "23505";

/** The key in full. It is returned once, right after it is created or replaced, and is never stored. */
export interface IssuedKey {
  id: string;
  key: string;
  hint: string;
  ownerLabel: string;
  umkmName: string;
  expiresAt: string | null;
}

export type IssueKeyState = DataActionState<IssuedKey>;

function describeTarget(umkmName: string, ownerLabel: string) {
  const owner = ownerLabel ? ` · untuk ${ownerLabel}` : "";
  return umkmName ? `Kunci akses · ${umkmName}${owner}` : `Kunci akses · UMKM baru${owner}`;
}

async function umkmNameOf(umkmId: string | null | undefined) {
  if (!umkmId) return "";

  const { data, error } = await createSupabaseAdminClient().from("umkm").select("name").eq("id", umkmId).maybeSingle();

  if (error) throw new ApiResponse(500, error.message);
  if (!data) throw new ApiResponse(404, "UMKM tidak ditemukan.");

  return data.name as string;
}

/**
 * Create a key for a new UMKM or for an existing one. An admin may type the key; otherwise one is generated.
 * @throws {ApiResponse} 400 invalid input or a typed key that is already in use, 401 not admin
 */
export async function createOwnerKeyAction(payload: unknown): Promise<IssueKeyState> {
  return runActionWithData(async () => {
    const input = parseInput(ownerKeyInputSchema, payload);
    const { admin } = await requireAdmin();
    const db = createSupabaseAdminClient();

    const umkmId = input.mode === "existing" ? input.umkmId || null : null;
    const umkmName = await umkmNameOf(umkmId);
    const expiresAt = input.expiresInDays ? new Date(Date.now() + input.expiresInDays * DAY_MS).toISOString() : null;

    const typed = input.customKey ? normalizeKey(input.customKey) : "";
    if (typed) assertValidCustomKey(typed);

    for (let attempt = 0; attempt < MAX_KEY_ATTEMPTS; attempt += 1) {
      const normalized = typed || generateKey();
      const { data, error } = await db
        .from("owner_keys")
        .insert({
          key_hash: hashKey(normalized),
          key_hint: keyHint(normalized),
          umkm_id: umkmId,
          owner_label: input.ownerLabel || null,
          expires_at: expiresAt,
          created_by: admin.id,
        })
        .select("id")
        .single();

      if (error?.code === UNIQUE_VIOLATION) {
        if (typed) throw new ApiResponse(400, "Kunci ini sudah dipakai. Ketik kunci lain atau biarkan sistem membuatnya.");
        continue;
      }

      if (error || !data) throw new ApiResponse(500, error?.message ?? "Kunci gagal dibuat.");

      await logActivity({
        action: "create",
        entityType: "owner_key",
        entityId: data.id,
        entityLabel: `Kunci ${maskedKey(keyHint(normalized))}`,
        entitySub: describeTarget(umkmName, input.ownerLabel),
        actor: adminActor(admin),
        summary: expiresAt ? `Kunci dibuat, berlaku sampai ${new Date(expiresAt).toLocaleDateString("id-ID")}` : "Kunci dibuat, tanpa batas waktu",
      });

      return new SuccessResponse(201, "Kunci akses berhasil dibuat.", {
        id: data.id as string,
        key: formatKey(normalized),
        hint: keyHint(normalized),
        ownerLabel: input.ownerLabel,
        umkmName,
        expiresAt,
      });
    }

    throw new ApiResponse(500, "Kunci gagal dibuat. Coba lagi.");
  });
}

/**
 * Replace the key of a UMKM owner with a new random one; the old key stops working at once.
 * @throws {ApiResponse} 401 not admin, 404 unknown key
 */
export async function regenerateOwnerKeyAction(keyId: string): Promise<IssueKeyState> {
  return runActionWithData(async () => {
    const id = parseInput(idSchema, keyId);
    const { admin } = await requireAdmin();
    const row = await getOwnerKeyById(id);
    const relation = Array.isArray(row.umkm) ? row.umkm[0] : row.umkm;

    if (row.revoked_at) throw new ApiResponse(400, "Kunci yang sudah dicabut tidak dapat diganti. Buat kunci baru.");

    const normalized = generateKey();
    const { error } = await createSupabaseAdminClient()
      .from("owner_keys")
      .update({ key_hash: hashKey(normalized), key_hint: keyHint(normalized), last_used_at: null })
      .eq("id", id);

    if (error) throw new ApiResponse(500, error.message);

    await logActivity({
      action: "update",
      entityType: "owner_key",
      entityId: id,
      entityLabel: `Kunci ${maskedKey(keyHint(normalized))}`,
      entitySub: describeTarget(relation?.name ?? "", row.owner_label ?? ""),
      actor: adminActor(admin),
      summary: `Kunci diganti, kunci lama ${maskedKey(row.key_hint)} tidak berlaku lagi`,
      changes: [{ field: "key", label: "Kunci", before: maskedKey(row.key_hint), after: maskedKey(keyHint(normalized)) }],
    });

    return new SuccessResponse(200, "Kunci berhasil diganti.", {
      id,
      key: formatKey(normalized),
      hint: keyHint(normalized),
      ownerLabel: row.owner_label ?? "",
      umkmName: relation?.name ?? "",
      expiresAt: row.expires_at,
    });
  });
}

/**
 * Revoke a key. Sessions that already use it end on their next request.
 * @throws {ApiResponse} 401 not admin, 404 unknown key
 */
export async function revokeOwnerKeyAction(keyId: string): Promise<DataActionState<{ status: OwnerKeyStatus }>> {
  return runActionWithData(async () => {
    const id = parseInput(idSchema, keyId);
    const { admin } = await requireAdmin();
    const row = await getOwnerKeyById(id);
    const relation = Array.isArray(row.umkm) ? row.umkm[0] : row.umkm;

    if (!row.revoked_at) {
      const { error } = await createSupabaseAdminClient()
        .from("owner_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw new ApiResponse(500, error.message);

      await logActivity({
        action: "delete",
        entityType: "owner_key",
        entityId: id,
        entityLabel: `Kunci ${maskedKey(row.key_hint)}`,
        entitySub: describeTarget(relation?.name ?? "", row.owner_label ?? ""),
        actor: adminActor(admin),
        summary: "Kunci dicabut",
      });
    }

    return new SuccessResponse(200, "Kunci berhasil dicabut.", { status: "revoked" as const });
  });
}
