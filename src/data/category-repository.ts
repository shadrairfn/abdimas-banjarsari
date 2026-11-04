import "server-only";
import type { BusinessCategory } from "@/features/categories/types";
import { UMKM_SUB_CATEGORIES } from "@/features/umkm/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ApiResponse } from "@/lib/http/api-response";

export async function listCategories(): Promise<BusinessCategory[]> {
  if (!isSupabaseConfigured()) return UMKM_SUB_CATEGORIES.map(name => ({ id: name, name, slug: name }));
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("categories").select("id,name,slug").eq("is_active", true).order("created_at").order("name");
  if (error) throw new ApiResponse(500, "Kategori tidak dapat dimuat.");
  return data;
}
