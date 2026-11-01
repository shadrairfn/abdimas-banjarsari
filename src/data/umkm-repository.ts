import "server-only";
import { umkmData as fallbackData } from "@/data/umkm";
import type { LocationStatus, Umkm, UmkmSubCategory } from "@/features/umkm/types";
import { idSchema } from "@/features/umkm/validation";
import { ApiResponse } from "@/lib/http/api-response";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UMKM_COLUMNS =
  "id,source_no,owner_name,name,products,address,latitude,longitude,location_status," +
  "contact,website,opening_hours,closing_hours,photos,categories!inner(name)";

type DatabaseUmkm = {
  id: string;
  source_no: number | null;
  owner_name: string | null;
  name: string;
  products: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  location_status: LocationStatus;
  contact?: string | null;
  website?: string | null;
  opening_hours?: string | null;
  closing_hours?: string | null;
  photos?: string[] | null;
  categories: { name: UmkmSubCategory } | { name: UmkmSubCategory }[];
};

function toPublicUmkm(row: DatabaseUmkm): Umkm {
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
    locationStatus: row.location_status,
    contact: row.contact ?? undefined,
    website: row.website ?? undefined,
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
