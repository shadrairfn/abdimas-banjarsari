"use server";

import { redirect } from "next/navigation";

import {
  createAdmin,
  setAdminGoogleLogin,
  setAdminRole,
  setAdminStatus,
} from "@/features/admin/admin-service";
import { signInWithPassword, signOutAdmin } from "@/features/admin/auth-service";
import { adminActor, saveUmkm } from "@/features/umkm/umkm-service";
import { umkmInputSchema } from "@/features/umkm/validation";
import { requireAdmin } from "@/lib/auth/admin";
import { parseFormArray } from "@/lib/http/form-data";
import { parseInput } from "@/lib/http/parse-input";
import { type ActionState, runAction } from "@/lib/http/run-action";
import { SuccessResponse } from "@/lib/http/success-response";

/** Validate password sign-in and redirect only after the server confirms active admin access. */
export async function signInAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(() => signInWithPassword(formData));

  // redirect() works by throwing, so it stays outside runAction.
  if (result.success) {
    redirect("/admin");
  }

  return result;
}

/** Close the current admin session and return to the public map. */
export async function signOutAction() {
  await signOutAdmin();
  redirect("/");
}

/**
 * Create a new UMKM, or update it when the form contains an id.
 * @throws {ApiResponse} 400 invalid input, 401 not admin, 404 unknown category
 */
async function upsertUmkm(formData: FormData) {
  const input = parseInput(umkmInputSchema, {
    ...Object.fromEntries(formData),
    photos: parseFormArray(formData.get("photos"), "foto", true),
    socials: parseFormArray(formData.get("socials"), "media sosial"),
    catalog: parseFormArray(formData.get("catalog"), "katalog produk"),
  });

  const { supabase, admin } = await requireAdmin();
  const result = await saveUmkm(supabase, adminActor(admin), input);

  return new SuccessResponse(
    result.created ? 201 : 200,
    result.created ? "UMKM baru berhasil ditambahkan." : "Data UMKM berhasil diperbarui.",
  );
}

/** Save validated business input through the shared action error/success boundary. */
export async function upsertUmkmAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(() => upsertUmkm(formData));
}

/** Create an approved admin account after checking the current Superadmin. */
export async function createAdminAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(() => createAdmin(formData));
}

/** Change another account's active status through the protected account service. */
export async function toggleAdminStatusAction(
  accountId: string,
  isActive: boolean,
): Promise<ActionState> {
  return runAction(() => setAdminStatus(accountId, isActive));
}

/** Set Google approval after server-side Superadmin authorization. */
export async function setAdminGoogleLoginAction(
  accountId: string,
  isAllowed: boolean,
): Promise<ActionState> {
  return runAction(() => setAdminGoogleLogin(accountId, isAllowed));
}

/** Change another account's role while keeping authorization on the server. */
export async function setAdminRoleAction(
  accountId: string,
  role: "superadmin" | "admin",
): Promise<ActionState> {
  return runAction(() => setAdminRole(accountId, role));
}
