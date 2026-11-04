import "server-only";

import { adminActor } from "@/features/umkm/umkm-service";
import { adminInputSchema, idSchema } from "@/features/umkm/validation";
import { logActivity } from "@/lib/activity-log";
import { requireSuperadmin } from "@/lib/auth/admin";
import { ApiResponse } from "@/lib/http/api-response";
import { parseInput } from "@/lib/http/parse-input";
import { SuccessResponse } from "@/lib/http/success-response";
import { revalidateUmkmPages } from "@/lib/revalidate";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

/**
 * Approve a Google email, or create a password-based Auth user and admin profile.
 * @throws {ApiResponse} 400 invalid input, 401 not admin, 500 if the account cannot be saved
 */
export async function createAdmin(formData: FormData) {
  const { admin: createdBy } = await requireSuperadmin();

  const input = parseInput(adminInputSchema, Object.fromEntries(formData));
  const serviceSupabase = createSupabaseAdminClient();
  const { data: registered, error: lookupError } = await serviceSupabase
    .from("admins")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();
  if (lookupError) {
    throw new ApiResponse(500, lookupError.message);
  }

  if (registered) {
    throw new ApiResponse(
      400,
      "Email ini sudah terdaftar. Atur izin Google pada baris akun tersebut.",
    );
  }

  if (input.mode === "google") {
    // Record approval only. Google creates/links the Auth identity at its first real sign-in.
    const { data: account, error } = await serviceSupabase
      .from("admins")
      .insert({
        email: input.email,
        full_name: input.email.slice(0, 120),
        user_id: null,
        role: input.role,
        is_active: true,
        google_login_allowed: true,
      })
      .select("id")
      .single();
    if (error) {
      throw new ApiResponse(400, "Email belum dapat diizinkan. Pastikan email belum terdaftar.");
    }

    await logActivity({
      action: "create",
      entityType: "admin",
      entityId: account.id,
      entityLabel: input.email,
      actor: adminActor(createdBy),
      summary: `Akun ${input.role === "superadmin" ? "Superadmin" : "Admin"} diizinkan melalui Google`,
    });
    revalidateUmkmPages();

    return new SuccessResponse(
      201,
      `Email ${input.email} diizinkan masuk sebagai ${input.role === "superadmin" ? "Superadmin" : "Admin"} melalui Google.`,
    );
  }

  const { data: userData, error: authError } = await serviceSupabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    app_metadata: { role: input.role },
    user_metadata: { full_name: input.fullName },
  });

  if (authError || !userData?.user) {
    throw new ApiResponse(500, authError?.message || "Gagal membuat akun admin.");
  }

  const { data: newAccount, error: profileError } = await serviceSupabase
    .from("admins")
    .insert({
      user_id: userData.user.id,
      email: input.email,
      full_name: input.fullName,
      is_active: true,
      role: input.role,
      google_login_allowed: false,
    })
    .select("id")
    .single();

  if (profileError) {
    // Remove the half-created account so the same email can be registered again.
    await serviceSupabase.auth.admin.deleteUser(userData.user.id);

    throw new ApiResponse(500, `Profil admin gagal disimpan: ${profileError.message}`);
  }

  await logActivity({
    action: "create",
    entityType: "admin",
    entityId: newAccount.id,
    entityLabel: input.fullName,
    actor: adminActor(createdBy),
    summary: `Akun ${input.role === "superadmin" ? "Superadmin" : "Admin"} dengan kata sandi ditambahkan`,
  });
  revalidateUmkmPages();

  return new SuccessResponse(201, `Admin baru (${input.email}) berhasil didaftarkan.`);
}
/** toggleAdminStatus after checking the current Superadmin. */
export async function setAdminStatus(accountId: string, isActive: boolean) {
  if (typeof isActive !== "boolean") {
    throw new ApiResponse(400, "Status tidak valid.");
  }

  await updateManagedAdmin(accountId, { is_active: isActive });
  revalidateUmkmPages();

  const statusText = isActive ? "diaktifkan" : "dinonaktifkan";

  return new SuccessResponse(200, `Akun admin berhasil ${statusText}.`);
}

async function updateManagedAdmin(
  accountId: string,
  values: { is_active?: boolean; google_login_allowed?: boolean; role?: "superadmin" | "admin" },
) {
  const { admin: actingAdmin } = await requireSuperadmin();
  const targetId = parseInput(idSchema, accountId);
  const serviceSupabase = createSupabaseAdminClient();
  const { data: target, error: lookupError } = await serviceSupabase
    .from("admins")
    .select("id,user_id,role,email,full_name,is_active,google_login_allowed")
    .eq("id", targetId)
    .maybeSingle();
  if (lookupError) {
    throw new ApiResponse(500, lookupError.message);
  }

  if (!target) {
    throw new ApiResponse(404, "Akun admin tidak ditemukan.");
  }

  if (
    target.user_id === actingAdmin.id &&
    (values.is_active !== undefined || values.role !== undefined)
  ) {
    throw new ApiResponse(400, "Anda tidak dapat mengubah peran atau status akun sendiri.");
  }

  const query = serviceSupabase.from("admins").update(values).eq("id", targetId);
  const { data: updatedAccount, error } = await query.select("id").maybeSingle();
  if (error) {
    throw new ApiResponse(error.code === "P0001" ? 400 : 500, error.message);
  }

  if (!updatedAccount) {
    throw new ApiResponse(400, "Akun tidak ditemukan atau merupakan Superadmin yang dilindungi.");
  }

  const fields = [
    { key: "role", label: "Peran" },
    { key: "is_active", label: "Status aktif" },
    { key: "google_login_allowed", label: "Izin login Google" },
  ] as const;
  const changes = fields
    .filter((field) => values[field.key] !== undefined && values[field.key] !== target[field.key])
    .map((field) => ({
      field: field.key,
      label: field.label,
      before: String(target[field.key]),
      after: String(values[field.key]),
    }));
  await logActivity({
    action: "update",
    entityType: "admin",
    entityId: target.id,
    entityLabel: target.full_name,
    actor: adminActor(actingAdmin),
    summary: changes.map((change) => change.label).join(", ") || "Pengaturan akun disimpan",
    changes,
  });
}
/** setAdminGoogleLogin after checking the current Superadmin. */
export async function setAdminGoogleLogin(accountId: string, isAllowed: boolean) {
  if (typeof isAllowed !== "boolean") {
    throw new ApiResponse(400, "Izin Google tidak valid.");
  }

  await updateManagedAdmin(accountId, { google_login_allowed: isAllowed });
  revalidateUmkmPages();

  return new SuccessResponse(
    200,
    isAllowed ? "Login Google akun admin diizinkan." : "Izin login Google akun admin dicabut.",
  );
}
/** setAdminRole after checking the current Superadmin. */
export async function setAdminRole(accountId: string, role: "superadmin" | "admin") {
  if (role !== "admin" && role !== "superadmin") {
    throw new ApiResponse(400, "Peran tidak valid.");
  }

  await updateManagedAdmin(accountId, { role });
  revalidateUmkmPages();

  return new SuccessResponse(200, "Peran akun berhasil diperbarui.");
}
