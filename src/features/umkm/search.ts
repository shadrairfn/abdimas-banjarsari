import type { Umkm } from "@/features/umkm/types";
import { distanceKm, type Coordinates } from "@/lib/geo";

export interface UmkmSearchFilter {
  query: string;
  subCategory: string;
  center: Coordinates | null;
  radiusKm: number | null;
}

function matchesQuery(item: Umkm, query: string) {
  if (!query) return true;

  const searchableText = `${item.brand} ${item.ownerName} ${item.products} ${item.address}`;
  return searchableText.toLocaleLowerCase("id-ID").includes(query);
}

function matchesRadius(item: Umkm, center: Coordinates | null, radiusKm: number | null) {
  if (!center || !radiusKm) return true;

  return distanceKm(center, item) <= radiusKm;
}

/** Keep the UMKM that match the text query, the sub-category, and the radius around a center. */
export function filterUmkm(items: Umkm[], filter: UmkmSearchFilter) {
  const query = filter.query.trim().toLocaleLowerCase("id-ID");

  return items.filter((item) => {
    const matchesCategory = !filter.subCategory || item.subCategory === filter.subCategory;

    return (
      matchesQuery(item, query) &&
      matchesCategory &&
      matchesRadius(item, filter.center, filter.radiusKm)
    );
  });
}
