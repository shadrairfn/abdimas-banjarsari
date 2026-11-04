import "server-only";
import { umkmData as fallbackData } from "@/data/umkm";
import type { CatalogProduct, SocialLink, Umkm, UmkmSubCategory } from "@/features/umkm/types";
import { idSchema } from "@/features/umkm/validation";
import { ApiResponse } from "@/lib/http/api-response";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const UMKM_COLUMNS = "*,categories!inner(name)";

export type DatabaseUmkm = {
  id: string;
  source_no: number | null;
  owner_name: string | null;
  name: string;
  products: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  price_description?: string | null;
  catalog?: CatalogProduct[] | null;
  featured_product?: string | null;
  notes?: string | null;
  google_maps_url?: string | null;
  contact?: string | null;
  website?: string | null;
  socials?: SocialLink[] | null;
  opening_hours?: string | null;
  closing_hours?: string | null;
  photos?: string[] | null;
  categories: { name: UmkmSubCategory } | { name: UmkmSubCategory }[];
};

// Rows saved before the socials column existed only have the single `website` text.
function readSocials(row: DatabaseUmkm): SocialLink[] {
  if (Array.isArray(row.socials) && row.socials.length > 0) return row.socials.map(link => link.platform === "Lainnya" && !link.customName ? { ...link, customName: "Lainnya" } : link);
  return row.website?.trim() ? [{ platform: "Situs web", handle: row.website.trim() }] : [];
}

export function toPublicUmkm(row: DatabaseUmkm): Umkm {
  const relation = Array.isArray(row.categories) ? row.categories[0] : row.categories;

  return {
    id: row.id,
    sourceNo: row.source_no ?? 0,
    ownerName: row.owner_name ?? "",
    brand: row.name,
    products: row.products ?? "",
    address: row.address ?? "",
    category: "Kuliner",
    subCategory: relation.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    priceDescription: row.price_description ?? undefined,
    catalog: Array.isArray(row.catalog) ? row.catalog : [],
    featuredProduct: row.featured_product ?? undefined,
    notes: row.notes ?? undefined,
    googleMapsUrl: row.google_maps_url ?? undefined,
    contact: row.contact ?? undefined,
    website: row.website ?? undefined,
    socials: readSocials(row),
    openingHours: row.opening_hours ?? undefined,
    closingHours: row.closing_hours ?? undefined,
    photos: Array.isArray(row.photos) ? row.photos : [],
  };
}

/**
 * List every active UMKM, sorted by name.
 * Falls back to the built-in read-only data when Supabase is not configured.
 * @throws {ApiResponse} 500 if the database query fails
 */
export async function listUmkm(): Promise<Umkm[]> {
  if (!isSupabaseConfigured()) {
    return fallbackData;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("umkm")
    .select(UMKM_COLUMNS)
    .eq("is_active", true)
    .order("name");


  if (error) {
    throw new ApiResponse(500, `Gagal memuat data UMKM: ${error.message}`);
  }

  return (data as unknown as DatabaseUmkm[]).map(toPublicUmkm);
}

/**
 * Find one active UMKM by id, or undefined when it does not exist.
 * @throws {ApiResponse} 500 if the database query fails
 */
export async function getUmkm(id: string): Promise<Umkm | undefined> {
  if (!isSupabaseConfigured()) {
    return fallbackData.find((item) => item.id === id);
  }

  // Postgres rejects a malformed uuid with an error, so treat it as "not found" instead.
  if (!idSchema.safeParse(id).success) {
    return undefined;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("umkm")
    .select(UMKM_COLUMNS)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();


  if (error) {
    throw new ApiResponse(500, `Gagal memuat data UMKM: ${error.message}`);
  }

  return data ? toPublicUmkm(data as unknown as DatabaseUmkm) : undefined;
}

/**
 * One UMKM by id for an owner's own page. Uses the service-role client so the owner sees the UMKM
 * even while it is hidden; the caller must already know that the key belongs to this UMKM.
 * @throws {ApiResponse} 500 if the database query fails
 */
export async function getUmkmForOwner(id: string): Promise<Umkm | undefined> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("umkm")
    .select(UMKM_COLUMNS)
    .eq("id", id)
    .maybeSingle();


  if (error) {
    throw new ApiResponse(500, `Gagal memuat data UMKM: ${error.message}`);
  }

  return data ? toPublicUmkm(data as unknown as DatabaseUmkm) : undefined;
}
