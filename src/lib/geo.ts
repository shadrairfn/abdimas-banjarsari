const EARTH_RADIUS_KM = 6371;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two coordinates, in kilometres (haversine). */
export function distanceKm(from: Coordinates, to: Coordinates) {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
