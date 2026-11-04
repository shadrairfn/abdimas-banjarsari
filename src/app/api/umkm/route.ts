import type { NextRequest } from "next/server";
import { listUmkm } from "@/data/umkm-repository";
import { filterUmkm } from "@/features/umkm/search";
import { asyncHandler } from "@/lib/http/async-handler";
import { SuccessResponse, sendSuccess } from "@/lib/http/success-response";

// A missing or non-numeric parameter means "not provided", never 0.
function readNumberParam(searchParams: URLSearchParams, name: string) {
  const raw = searchParams.get(name);
  if (raw === null || raw.trim() === "") return null;

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * Public list of UMKM, optionally filtered.
 * @route GET /api/umkm?q=&subcategory=&lat=&lng=&radius=
 */
export const GET = asyncHandler(async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const latitude = readNumberParam(searchParams, "lat");
  const longitude = readNumberParam(searchParams, "lng");
  const hasCenter = latitude !== null && longitude !== null;

  const allItems = await listUmkm();

  const items = filterUmkm(allItems, {
    query: searchParams.get("q") ?? "",
    subCategory: searchParams.get("subcategory") ?? "",
    center: hasCenter ? { latitude, longitude } : null,
    radiusKm: readNumberParam(searchParams, "radius"),
  });


  const responseData = {
    items,
    total: items.length,
  };

  return sendSuccess(new SuccessResponse(200, "Data UMKM berhasil dimuat.", responseData));
});
