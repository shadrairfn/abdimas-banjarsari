"use server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { runActionWithData, type DataActionState } from "@/lib/http/run-action";
import { parseInput } from "@/lib/http/parse-input";
import { ApiResponse } from "@/lib/http/api-response";
import { SuccessResponse } from "@/lib/http/success-response";
import { logActivity } from "@/lib/activity-log";
import { adminActor } from "@/features/umkm/umkm-service";
import { revalidateUmkmPages } from "@/lib/revalidate";
import type { BusinessCategory } from "@/features/categories/types";

export async function createCategoryAction(name: string): Promise<DataActionState<BusinessCategory>> {
  return runActionWithData(async () => {
    const { admin } = await requireAdmin();
    const value = parseInput(z.string().trim().min(2).max(60).refine(value => value.toLowerCase() !== "semua", "Nama kategori ini digunakan untuk filter semua kategori."), name);
    const db = createSupabaseAdminClient();
    const slug = value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `kategori-${crypto.randomUUID().slice(0, 8)}`;
    const { data, error } = await db.from("categories").insert({ name: value, slug: `${slug}-${crypto.randomUUID().slice(0, 6)}`, icon_key: "store", color: "#2563eb", is_active: true }).select("id,name,slug").single();
    if (error) throw new ApiResponse(400, error.code === "23505" ? "Nama kategori sudah tersedia." : "Kategori gagal ditambahkan.");
    await logActivity({ action: "create", entityType: "category", entityId: data.id, entityLabel: data.name, actor: adminActor(admin), summary: "Kategori UMKM baru ditambahkan" });
    revalidateUmkmPages();
    return new SuccessResponse(201, "Kategori berhasil ditambahkan.", data);
  });
}
