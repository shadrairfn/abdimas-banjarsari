"use server";

import { redirect } from "next/navigation";
import { saveUmkm } from "@/features/umkm/umkm-service";
import { ownerKeyEntrySchema, umkmInputSchema } from "@/features/umkm/validation";
import { requireOwner, unlockWithKey } from "@/lib/auth/owner";
import { parseInput } from "@/lib/http/parse-input";
import { runAction, type ActionState } from "@/lib/http/run-action";
import { SuccessResponse } from "@/lib/http/success-response";
import { clearOwnerSession } from "@/lib/owner/session";
import { logActivity } from "@/lib/activity-log";
import { getOwnerKey } from "@/lib/auth/owner";

function parseJsonList(rawValue: FormDataEntryValue | null): unknown[] {
  if (typeof rawValue !== "string" || !rawValue.trim()) return [];

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function ownerSignInAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const { key } = parseInput(ownerKeyEntrySchema, Object.fromEntries(formData));
    await unlockWithKey(key);
    return new SuccessResponse(200, "Kunci diterima.");
  });

  // redirect() works by throwing, so it stays outside runAction.
  if (result.success) redirect("/pemilik/usaha");

  return result;
}

export async function ownerSignOutAction() {
  const key = await getOwnerKey();
  if (key) await logActivity({ action: "logout", entityType: "session", entityId: key.id, entityLabel: "Portal pemilik", actor: { type: "owner", keyId: key.id, keyHint: key.key_hint, name: key.owner_label || "Pemilik" }, summary: "Keluar dari portal pemilik" });
  await clearOwnerSession();
  redirect("/pemilik");
}

/**
 * Fill in or change the UMKM of the owner key. The UMKM is taken from the key, never from the form,
 * so a key can only ever change its own shop.
 * @throws {ApiResponse} 400 invalid input, 401 if the key stopped working
 */
export async function ownerSaveUmkmAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const input = parseInput(umkmInputSchema, {
      ...Object.fromEntries(formData),
      photos: parseJsonList(formData.get("photos")),
      socials: parseJsonList(formData.get("socials")),
      catalog: parseJsonList(formData.get("catalog")),
    });

    const { key, supabase } = await requireOwner();
    const owner = {
      type: "owner" as const,
      keyId: key.id,
      keyHint: key.key_hint,
      name: input.ownerName || key.owner_label || "Pemilik",
      umkmId: key.umkm_id,
    };
    const result = await saveUmkm(supabase, owner, input);

    return new SuccessResponse(200, result.created ? "Data usaha tersimpan dan sudah tampil di peta." : "Perubahan tersimpan.");
  });
}
