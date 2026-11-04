import type { Umkm } from "@/features/umkm/types";

/** Prefer a business photo, then use the first product photo available. */
export function coverPhoto(item: Pick<Umkm, "photos" | "catalog">): string | undefined {
  return item.photos?.find(Boolean) || item.catalog?.find((product) => product.photoUrl)?.photoUrl;
}
