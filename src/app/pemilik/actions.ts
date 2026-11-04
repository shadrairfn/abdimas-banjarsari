"use server";

import { redirect } from "next/navigation";

import { saveUmkm } from "@/features/umkm/umkm-service";
import { ownerKeyEntrySchema, umkmInputSchema } from "@/features/umkm/validation";
import { requireOwner, unlockWithKey } from "@/lib/auth/owner";
import { parseFormArray } from "@/lib/http/form-data";
import { parseInput } from "@/lib/http/parse-input";
import { type ActionState, runAction } from "@/lib/http/run-action";
import { SuccessResponse } from "@/lib/http/success-response";
import { clearOwnerSession } from "@/lib/owner/session";

/** Unlock an owner session and redirect after validating the access key. */
export async function ownerSignInAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = await runAction(async () => {
    const { key } = parseInput(ownerKeyEntrySchema, Object.fromEntries(formData));
    await unlockWithKey(key);

    return new SuccessResponse(200, "Kunci diterima.");
  });

  // redirect() works by throwing, so it stays outside runAction.
  if (result.success) {
    redirect("/pemilik/usaha");
  }

  return result;
}

/** Clear the signed owner session and return to the key form. */
export async function ownerSignOutAction() {
  await clearOwnerSession();
  redirect("/pemilik");
}

/**
 * Fill in or change the UMKM of the owner key. The UMKM is taken from the key, never from the form,
 * so a key can only ever change its own shop.
 * @throws {ApiResponse} 400 invalid input, 401 if the key stopped working
 */
export async function ownerSaveUmkmAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const input = parseInput(umkmInputSchema, {
      ...Object.fromEntries(formData),
      photos: parseFormArray(formData.get("photos"), "foto", true),
      socials: parseFormArray(formData.get("socials"), "media sosial"),
      catalog: parseFormArray(formData.get("catalog"), "katalog produk"),
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

    return new SuccessResponse(
      result.created ? 201 : 200,
      result.created ? "Data usaha tersimpan dan sudah tampil di peta." : "Perubahan tersimpan.",
    );
  });
}
