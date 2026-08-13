import { z } from "zod";
import { UMKM_SUB_CATEGORIES } from "@/features/umkm/types";

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().default("");

export const umkmInputSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Nama usaha minimal 2 karakter.").max(120),
  ownerName: optionalText(120),
  products: optionalText(500),
  address: optionalText(500),
  subCategory: z.enum(UMKM_SUB_CATEGORIES),
  latitude: z.coerce.number().min(-90, "Latitude minimal -90.").max(90, "Latitude maksimal 90."),
  longitude: z.coerce.number().min(-180, "Longitude minimal -180.").max(180, "Longitude maksimal 180."),
  locationStatus: z.enum(["estimated", "verified", "outside"]).default("verified"),
});
