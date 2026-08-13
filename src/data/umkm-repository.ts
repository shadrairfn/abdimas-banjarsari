import "server-only";
import { umkmData as fallbackData } from "@/data/umkm";
import type { LocationStatus, Umkm, UmkmSubCategory } from "@/features/umkm/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  };
}

export async function listUmkm(): Promise<Umkm[]> {
  if (!isSupabaseConfigured()) return fallbackData;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("umkm")
    .select("id,source_no,owner_name,name,products,address,latitude,longitude,location_status,categories!inner(name)")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`Unable to load UMKM: ${error.message}`);
  return (data as unknown as DatabaseUmkm[]).map(toPublicUmkm);
}

export async function getUmkm(id: string): Promise<Umkm | undefined> {
  if (!isSupabaseConfigured()) return fallbackData.find((item) => item.id === id);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("umkm")
    .select("id,source_no,owner_name,name,products,address,latitude,longitude,location_status,categories!inner(name)")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(`Unable to load UMKM: ${error.message}`);
  return data ? toPublicUmkm(data as unknown as DatabaseUmkm) : undefined;
}
