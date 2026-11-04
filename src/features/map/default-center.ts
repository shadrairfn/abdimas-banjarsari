import { BANJARSARI_CENTER } from "@/features/umkm/types";
import { type Coordinates, distanceKm } from "@/lib/geo";

const VILLAGE_RADIUS_KM = 5;

/** Center the initial view on local UMKM, excluding shops outside the Banjarsari area. */
export function getDefaultMapCenter(items: Coordinates[]): Coordinates {
  const localItems = items.filter(
    (item) =>
      Number.isFinite(item.latitude) &&
      Number.isFinite(item.longitude) &&
      distanceKm(BANJARSARI_CENTER, item) <= VILLAGE_RADIUS_KM,
  );
  if (localItems.length === 0) {
    return { ...BANJARSARI_CENTER };
  }

  const total = localItems.reduce(
    (sum, item) => ({
      latitude: sum.latitude + item.latitude,
      longitude: sum.longitude + item.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return {
    latitude: total.latitude / localItems.length,
    longitude: total.longitude / localItems.length,
  };
}
