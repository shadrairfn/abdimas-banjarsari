import "server-only";

import { z } from "zod";

import { adminActor } from "@/features/umkm/umkm-service";
import { logActivity } from "@/lib/activity-log";
import { requireAdmin } from "@/lib/auth/admin";
import { ApiResponse } from "@/lib/http/api-response";
import { parseInput } from "@/lib/http/parse-input";
import { SuccessResponse } from "@/lib/http/success-response";
import { revalidateUmkmPages } from "@/lib/revalidate";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

/** Validate, persist, and audit a custom category after checking admin access. */
export async function createCategory(name: string) {
  const { admin } = await requireAdmin();
  const value = parseInput(
    z
      .string()
      .trim()
      .min(2)
      .max(60)
      .refine(
        (value) => value.toLowerCase() !== "semua",
        "Nama kategori ini digunakan untuk filter semua kategori.",
      ),
    name,
  );
  const databaseClient = createSupabaseAdminClient();
  const slug =
    value
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `kategori-${crypto.randomUUID().slice(0, 8)}`;
  const { data: createdCategory, error } = await databaseClient
    .from("categories")
    .insert({
      name: value,
      slug: `${slug}-${crypto.randomUUID().slice(0, 6)}`,
      icon_key: "store",
      color: "#2563eb",
      is_active: true,
    })
    .select("id,name,slug")
    .single();
  if (error) {
    throw new ApiResponse(
      400,
      error.code === "23505" ? "Nama kategori sudah tersedia." : "Kategori gagal ditambahkan.",
    );
  }

  await logActivity({
    action: "create",
    entityType: "category",
    entityId: createdCategory.id,
    entityLabel: createdCategory.name,
    actor: adminActor(admin),
    summary: "Kategori UMKM baru ditambahkan",
  });
  revalidateUmkmPages();

  return new SuccessResponse(201, "Kategori berhasil ditambahkan.", createdCategory);
}
