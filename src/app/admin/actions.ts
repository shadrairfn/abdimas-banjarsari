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
import { adminActor, saveUmkm } from "@/features/umkm/umkm-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";

// Lists such as photos and socials are sent as a JSON string.
function parseJsonList(rawValue: FormDataEntryValue | null): unknown[] {
  if (typeof rawValue !== "string" || !rawValue.trim()) return [];

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A plain comma-separated list is still accepted for photos.
    return rawValue.split(",").map((value) => value.trim()).filter(Boolean);
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
    await logActivity({ action: "login_failed", entityType: "session", entityLabel: "Login admin", actor: { type: "system", name: email }, summary: "Login email dan kata sandi gagal" });
    throw new ApiResponse(401, "Email atau kata sandi tidak valid.");
  }

  const admin = await getActiveAdmin(supabase);

  if (!admin) {
    await logActivity({ action: "login_failed", entityType: "session", entityLabel: "Login admin", actor: { type: "system", name: email }, summary: "Akun tidak memiliki akses admin aktif" });
    await supabase.auth.signOut();
    throw new ApiResponse(403, "Akun ini tidak memiliki akses admin aktif.");
  }

  await logActivity({ action: "login", entityType: "session", entityLabel: admin.profileName, entityId: admin.profile.id, actor: adminActor(admin), summary: "Masuk dengan email dan kata sandi" });
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
  const admin = await getActiveAdmin(supabase);
  if (admin) await logActivity({ action: "logout", entityType: "session", entityLabel: admin.profileName, entityId: admin.profile.id, actor: adminActor(admin), summary: "Keluar dari dashboard" });
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
    photos: parseJsonList(formData.get("photos")),
    socials: parseJsonList(formData.get("socials")),
    catalog: parseJsonList(formData.get("catalog")),
  });

  const { supabase, admin } = await requireAdmin();
  const result = await saveUmkm(supabase, adminActor(admin), input);

  return new SuccessResponse(200, result.created ? "UMKM baru berhasil ditambahkan." : "Data UMKM berhasil diperbarui.");
}

export async function upsertUmkmAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(() => upsertUmkm(formData));
}

/**
 * Approve a Google email, or create a password-based Auth user and admin profile.
 * @throws {ApiResponse} 400 invalid input, 401 not admin, 500 if the account cannot be saved
 */
async function createAdmin(formData: FormData) {
  const { admin: createdBy } = await requireSuperadmin();

  const input = parseInput(adminInputSchema, Object.fromEntries(formData));
  const serviceSupabase = createSupabaseAdminClient();
  const { data: registered, error: lookupError } = await serviceSupabase.from("admins").select("id").eq("email", input.email).maybeSingle();
  if (lookupError) throw new ApiResponse(500, lookupError.message);
  if (registered) throw new ApiResponse(400, "Email ini sudah terdaftar. Atur izin Google pada baris akun tersebut.");

  if (input.mode === "google") {
    // Record approval only. Google creates/links the Auth identity at its first real sign-in.
    const { data: account, error } = await serviceSupabase.from("admins").insert({
      email: input.email, full_name: input.email.slice(0, 120),
      user_id: null, role: input.role, is_active: true, google_login_allowed: true,
    }).select("id").single();
    if (error) throw new ApiResponse(400, "Email belum dapat diizinkan. Pastikan email belum terdaftar.");
    await logActivity({ action: "create", entityType: "admin", entityId: account.id, entityLabel: input.email, actor: adminActor(createdBy), summary: `Akun ${input.role === "superadmin" ? "Superadmin" : "Admin"} diizinkan melalui Google` });
    revalidateUmkmPages();
    return new SuccessResponse(201, `Email ${input.email} diizinkan masuk sebagai ${input.role === "superadmin" ? "Superadmin" : "Admin"} melalui Google.`);
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

  const { data: newAccount, error: profileError } = await serviceSupabase.from("admins").insert(
    {
      user_id: userData.user.id,
      email: input.email,
      full_name: input.fullName,
      is_active: true,
      role: input.role,
      google_login_allowed: false,
    },
  ).select("id").single();

  if (profileError) {
    // Remove the half-created account so the same email can be registered again.
    await serviceSupabase.auth.admin.deleteUser(userData.user.id);
    throw new ApiResponse(500, `Profil admin gagal disimpan: ${profileError.message}`);
  }

  await logActivity({ action: "create", entityType: "admin", entityId: newAccount.id, entityLabel: input.fullName, actor: adminActor(createdBy), summary: `Akun ${input.role === "superadmin" ? "Superadmin" : "Admin"} dengan kata sandi ditambahkan` });
  revalidateUmkmPages();

  return new SuccessResponse(201, `Admin baru (${input.email}) berhasil didaftarkan.`);
}

export async function createAdminAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(() => createAdmin(formData));
}

export async function toggleAdminStatusAction(accountId: string, nextStatus: boolean): Promise<ActionState> {
  return runAction(async () => {
    if (typeof nextStatus !== "boolean") throw new ApiResponse(400, "Status tidak valid.");
    await updateManagedAdmin(accountId, { is_active: nextStatus });
    revalidateUmkmPages();

    const statusText = nextStatus ? "diaktifkan" : "dinonaktifkan";
    return new SuccessResponse(200, `Akun admin berhasil ${statusText}.`);
  });
}

async function updateManagedAdmin(accountId: string, values: { is_active?: boolean; google_login_allowed?: boolean; role?: "superadmin" | "admin" }) {
  const { admin: actingAdmin } = await requireSuperadmin();
  const targetId = parseInput(idSchema, accountId);
  const serviceSupabase = createSupabaseAdminClient();
  const { data: target, error: lookupError } = await serviceSupabase.from("admins").select("id,user_id,role,email,full_name,is_active,google_login_allowed").eq("id", targetId).maybeSingle();
  if (lookupError) throw new ApiResponse(500, lookupError.message);
  if (!target) throw new ApiResponse(404, "Akun admin tidak ditemukan.");
  if (target.user_id === actingAdmin.id && (values.is_active !== undefined || values.role !== undefined)) throw new ApiResponse(400, "Anda tidak dapat mengubah peran atau status akun sendiri.");
  const query = serviceSupabase.from("admins").update(values).eq("id", targetId);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw new ApiResponse(error.code === "P0001" ? 400 : 500, error.message);
  if (!data) throw new ApiResponse(400, "Akun tidak ditemukan atau merupakan Superadmin yang dilindungi.");
  const fields = [
    { key: "role", label: "Peran" }, { key: "is_active", label: "Status aktif" }, { key: "google_login_allowed", label: "Izin login Google" },
  ] as const;
  const changes = fields.filter(field => values[field.key] !== undefined && values[field.key] !== target[field.key]).map(field => ({ field: field.key, label: field.label, before: String(target[field.key]), after: String(values[field.key]) }));
  await logActivity({ action: "update", entityType: "admin", entityId: target.id, entityLabel: target.full_name, actor: adminActor(actingAdmin), summary: changes.map(change => change.label).join(", ") || "Pengaturan akun disimpan", changes });
}

export async function setAdminGoogleLoginAction(accountId: string, allowed: boolean): Promise<ActionState> {
  return runAction(async () => {
    if (typeof allowed !== "boolean") throw new ApiResponse(400, "Izin Google tidak valid.");
    await updateManagedAdmin(accountId, { google_login_allowed: allowed });
    revalidateUmkmPages();
    return new SuccessResponse(200, allowed ? "Login Google akun admin diizinkan." : "Izin login Google akun admin dicabut.");
  });
}

export async function setAdminRoleAction(accountId: string, role: "superadmin" | "admin"): Promise<ActionState> {
  return runAction(async () => {
    if (role !== "admin" && role !== "superadmin") throw new ApiResponse(400, "Peran tidak valid.");
    await updateManagedAdmin(accountId, { role });
    revalidateUmkmPages();
    return new SuccessResponse(200, "Peran akun berhasil diperbarui.");
  });
}
