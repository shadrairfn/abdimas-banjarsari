import { NextRequest } from "next/server";
import { listUmkm } from "@/data/umkm-repository";

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const latDelta = toRad(lat2 - lat1);
  const lngDelta = toRad(lng2 - lng1);
  const value = Math.sin(latDelta / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export async function GET(request: NextRequest) {
  const umkmData = await listUmkm();
  const query = request.nextUrl.searchParams.get("q")?.trim().toLocaleLowerCase("id-ID") ?? "";
  const subCategory = request.nextUrl.searchParams.get("subcategory") ?? "";
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lng"));
  const radius = Number(request.nextUrl.searchParams.get("radius"));
  const hasRadius = Number.isFinite(latitude) && Number.isFinite(longitude) && Number.isFinite(radius) && radius > 0;
  const data = umkmData.filter((item) => {
    const matchesQuery = !query || `${item.brand} ${item.ownerName} ${item.products} ${item.address}`.toLocaleLowerCase("id-ID").includes(query);
    const matchesCategory = !subCategory || item.subCategory === subCategory;
    const matchesRadius = !hasRadius || distanceKm(latitude, longitude, item.latitude, item.longitude) <= radius;
    return matchesQuery && matchesCategory && matchesRadius;
  });
  return Response.json({ data, total: data.length, locationAccuracy: data.every((item) => item.locationStatus === "verified") ? "verified" : "mixed" });
}
