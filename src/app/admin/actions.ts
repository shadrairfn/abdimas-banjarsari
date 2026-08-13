"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { umkmInputSchema } from "@/features/umkm/validation";
import { getActiveAdmin } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminActionState = { success: boolean; message: string };

async function requireAdmin() {
  if (!isSupabaseConfigured()) throw new Error("Supabase belum dikonfigurasi.");
  const supabase = await createSupabaseServerClient();
  if (!await getActiveAdmin(supabase)) throw new Error("Akses admin diperlukan.");
  return supabase;
}

export async function signInAction(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  if (!isSupabaseConfigured()) return { success: false, message: "Lengkapi environment Supabase terlebih dahulu." };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, message: "Email atau kata sandi tidak valid." };
  if (!await getActiveAdmin(supabase)) {
    await supabase.auth.signOut();
    return { success: false, message: "Akun ini tidak memiliki akses admin aktif." };
  }
  redirect("/admin");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function upsertUmkmAction(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const parsed = umkmInputSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." };
    const supabase = await requireAdmin();
    const input = parsed.data;
    const { data: category, error: categoryError } = await supabase.from("categories").select("id").eq("name", input.subCategory).eq("is_active", true).single();
    if (categoryError || !category) return { success: false, message: "Kategori tidak ditemukan." };
    const record = {
      name: input.name,
      owner_name: input.ownerName || null,
      products: input.products || null,
      address: input.address || null,
      category_id: category.id,
      latitude: input.latitude,
      longitude: input.longitude,
      location_status: input.locationStatus,
      is_active: true,
    };
    const query = input.id
      ? supabase.from("umkm").update(record).eq("id", input.id)
      : supabase.from("umkm").insert(record);
    const { error } = await query;
    if (error) return { success: false, message: error.message };
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/api/umkm");
    if (input.id) revalidatePath(`/umkm/${input.id}`);
    return { success: true, message: input.id ? "Data UMKM berhasil diperbarui." : "UMKM baru berhasil ditambahkan." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Terjadi kesalahan." };
  }
}

export async function setLocationStatusAction(id: string, status: "estimated" | "verified" | "outside") {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("umkm").update({ location_status: status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/umkm/${id}`);
}
