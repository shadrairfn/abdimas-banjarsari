import { z } from "zod";
import { UMKM_SUB_CATEGORIES } from "@/features/umkm/types";

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().default("");

export const MAX_PHOTOS_PER_UMKM = 10;

export const idSchema = z.string().uuid("ID tidak valid.");


export const umkmInputSchema = z.object({
  id: idSchema.optional().or(z.literal("")),
  name: z.string().trim().min(2, "Nama usaha minimal 2 karakter.").max(120),
  ownerName: optionalText(120),
  products: optionalText(500),
  address: optionalText(500),
  subCategory: z.enum(UMKM_SUB_CATEGORIES),
  latitude: z.coerce.number().min(-90, "Latitude minimal -90.").max(90, "Latitude maksimal 90."),
  longitude: z.coerce.number().min(-180, "Longitude minimal -180.").max(180, "Longitude maksimal 180."),
  contact: optionalText(50),
  website: optionalText(255),
  openingHours: optionalText(10),
  closingHours: optionalText(10),
  photos: z
    .array(z.string().url("URL foto tidak valid."))
    .max(MAX_PHOTOS_PER_UMKM, `Maksimal ${MAX_PHOTOS_PER_UMKM} foto.`)
    .optional()
    .default([]),
});

export const signInSchema = z.object({
  email: z.string().trim().min(1, "Email dan kata sandi wajib diisi."),
  password: z.string().min(1, "Email dan kata sandi wajib diisi."),
});

export const adminInputSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Format email admin tidak valid.")),
  password: z.string().min(8, "Kata sandi harus terdiri dari minimal 8 karakter."),
  fullName: z
    .string()
    .trim()
    .min(2, "Nama lengkap admin harus diisi minimal 2 karakter.")
    .max(120, "Nama lengkap admin maksimal 120 karakter."),
});
