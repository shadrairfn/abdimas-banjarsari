"use server";

import { redirect } from "next/navigation";
import {
  adminInputSchema,
  idSchema,
  signInSchema,
  umkmInputSchema,
} from "@/features/umkm/validation";
import { getActiveAdmin, requireAdmin, requireSuperadmin } from "@/lib/auth/admin";
import { ApiResponse } from "@/lib/http/api-response";
import { parseInput } from "@/lib/http/parse-input";
import { runAction, type ActionState } from "@/lib/http/run-action";
import { SuccessResponse } from "@/lib/http/success-response";
import { revalidateUmkmPages } from "@/lib/revalidate";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// The photo list is sent as a JSON string; a plain comma-separated list is still accepted.
function parsePhotoList(rawValue: FormDataEntryValue | null): string[] {
  if (typeof rawValue !== "string" || !rawValue.trim()) return [];

  try {
    return JSON.parse(rawValue);
  } catch {
    return rawValue.split(",").map((url) => url.trim()).filter(Boolean);
  }
}

/** @throws {ApiResponse} 401 if the credentials are wrong or the account is not an active admin */
async function signIn(formData: FormData) {
  if (!isSupabaseConfigured()) {
    throw new ApiResponse(503, "Lengkapi environment Supabase terlebih dahulu.");
  }

  const { email, password } = parseInput(signInSchema, Object.fromEntries(formData));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new ApiResponse(401, "Email atau kata sandi tidak valid.");
  }

  const admin = await getActiveAdmin(supabase);

  if (!admin) {
    await supabase.auth.signOut();
    throw new ApiResponse(403, "Akun ini tidak memiliki akses admin aktif.");
  }

  return new SuccessResponse(200, "Berhasil masuk.");
}

export async function signInAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(() => signIn(formData));

  // redirect() works by throwing, so it stays outside runAction.
  if (result.success) {
    redirect("/admin");
  }

  return result;
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Create a new UMKM, or update it when the form contains an id.
 * @throws {ApiResponse} 400 invalid input, 401 not admin, 404 unknown category
 */
async function upsertUmkm(formData: FormData) {
  const input = parseInput(umkmInputSchema, {
    ...Object.fromEntries(formData),
    photos: parsePhotoList(formData.get("photos")),
  });

  const { supabase } = await requireAdmin();

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("name", input.subCategory)
    .eq("is_active", true)
    .single();

  if (categoryError || !category) {
    throw new ApiResponse(404, "Kategori tidak ditemukan.");
  }

  const record = {
    name: input.name,
    owner_name: input.ownerName || null,
    products: input.products || null,
    address: input.address || null,
    category_id: category.id,
    latitude: input.latitude,
    longitude: input.longitude,
    contact: input.contact || null,
    website: input.website || null,
    opening_hours: input.openingHours || null,
    closing_hours: input.closingHours || null,
    photos: input.photos,
    is_active: true,
  };

  const isUpdate = Boolean(input.id);
  const query = input.id
    ? supabase.from("umkm").update(record).eq("id", input.id)
    : supabase.from("umkm").insert(record);

  const { error } = await query;

  if (error) {
    throw new ApiResponse(500, error.message);
  }

  revalidateUmkmPages(input.id || undefined);

  const message = isUpdate ? "Data UMKM berhasil diperbarui." : "UMKM baru berhasil ditambahkan.";
  return new SuccessResponse(200, message);
}

export async function upsertUmkmAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(() => upsertUmkm(formData));
}


/**
 * Register a new admin: a Supabase Auth user plus a row in the admins table.
 * @throws {ApiResponse} 400 invalid input, 401 not admin, 500 if the account cannot be saved
 */
async function createAdmin(formData: FormData) {
  await requireSuperadmin();

  const input = parseInput(adminInputSchema, Object.fromEntries(formData));
  const serviceSupabase = createSupabaseAdminClient();

  const { data: userData, error: authError } = await serviceSupabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: input.fullName },
  });

  if (authError || !userData?.user) {
    throw new ApiResponse(500, authError?.message || "Gagal membuat akun admin.");
  }

  const { error: profileError } = await serviceSupabase.from("admins").upsert(
    {
      user_id: userData.user.id,
      email: input.email,
      full_name: input.fullName,
      is_active: true,
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    // Remove the half-created account so the same email can be registered again.
    await serviceSupabase.auth.admin.deleteUser(userData.user.id);
    throw new ApiResponse(500, `Profil admin gagal disimpan: ${profileError.message}`);
  }

  revalidateUmkmPages();

  return new SuccessResponse(201, `Admin baru (${input.email}) berhasil didaftarkan.`);
}

export async function createAdminAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(() => createAdmin(formData));
}

export async function toggleAdminStatusAction(userId: string, nextStatus: boolean): Promise<ActionState> {
  return runAction(async () => {
    const targetUserId = parseInput(idSchema, userId);
    const { admin } = await requireSuperadmin();

    if (admin.id === targetUserId) {
      throw new ApiResponse(400, "Anda tidak dapat mengubah status akun Anda sendiri.");
    }

    const serviceSupabase = createSupabaseAdminClient();
    const { error } = await serviceSupabase
      .from("admins")
      .update({ is_active: nextStatus })
      .eq("user_id", targetUserId);

    if (error) {
      throw new ApiResponse(500, error.message);
    }

    revalidateUmkmPages();

    const statusText = nextStatus ? "diaktifkan" : "dinonaktifkan";
    return new SuccessResponse(200, `Akun admin berhasil ${statusText}.`);
  });
}
