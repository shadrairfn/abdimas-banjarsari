import { z } from "zod";

import { SOCIAL_PLATFORMS } from "@/features/umkm/types";

import { MAX_CATALOG_PRODUCTS, MAX_PRODUCT_NAME_LENGTH, MAX_PRODUCT_PRICE } from "./constants";

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().default("");

export const MAX_PHOTOS_PER_UMKM = 10;
export const MAX_SOCIALS_PER_UMKM = 6;

export const idSchema = z.string().uuid("ID tidak valid.");

export const socialLinkSchema = z
  .object({
    platform: z.enum(SOCIAL_PLATFORMS),
    customName: optionalText(60),
    handle: z
      .string()
      .trim()
      .min(1, "Akun media sosial tidak boleh kosong.")
      .max(120, "Akun media sosial maksimal 120 karakter."),
  })
  .refine((value) => value.platform !== "Lainnya" || value.customName.length >= 2, {
    message: "Isi nama media sosial lainnya minimal 2 karakter.",
    path: ["customName"],
  });

export const catalogProductSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1, "Nama produk wajib diisi.").max(MAX_PRODUCT_NAME_LENGTH),
  price: z.number().finite().min(0).max(MAX_PRODUCT_PRICE).nullable(),
  priceLabel: optionalText(500),
  unit: optionalText(40),
  description: optionalText(500),
  photoUrl: z
    .string()
    .url()
    .refine((value) => /^https?:\/\//.test(value), "URL foto produk tidak valid.")
    .or(z.literal(""))
    .optional()
    .default(""),
});

// Shared fields for the admin and owner forms.
export const umkmInputSchema = z.object({
  id: idSchema.optional().or(z.literal("")),
  name: z.string().trim().min(2, "Nama usaha minimal 2 karakter.").max(120),
  ownerName: optionalText(120),
  products: optionalText(500),
  address: optionalText(500),
  priceDescription: optionalText(500),
  catalog: z.array(catalogProductSchema).max(MAX_CATALOG_PRODUCTS).optional().default([]),
  featuredProduct: optionalText(500),
  notes: optionalText(1000),
  googleMapsUrl: optionalText(500).refine(
    (value) => !value || /^https:\/\/(maps\.app\.goo\.gl|(?:www\.)?google\.com)\//.test(value),
    "Tautan Google Maps tidak valid.",
  ),
  subCategory: z.string().trim().min(2).max(60),
  latitude: z.coerce.number().min(-90, "Latitude minimal -90.").max(90, "Latitude maksimal 90."),
  longitude: z.coerce
    .number()
    .min(-180, "Longitude minimal -180.")
    .max(180, "Longitude maksimal 180."),
  contact: optionalText(50),
  socials: z
    .array(socialLinkSchema)
    .max(MAX_SOCIALS_PER_UMKM, `Maksimal ${MAX_SOCIALS_PER_UMKM} media sosial.`)
    .optional()
    .default([]),
  openingHours: optionalText(10),
  closingHours: optionalText(10),
  photos: z
    .array(z.string().url("URL foto tidak valid."))
    .max(MAX_PHOTOS_PER_UMKM, `Maksimal ${MAX_PHOTOS_PER_UMKM} foto.`)
    .optional()
    .default([]),
});

export type UmkmInput = z.output<typeof umkmInputSchema>;

export const signInSchema = z.object({
  email: z.string().trim().min(1, "Email dan kata sandi wajib diisi."),
  password: z.string().min(1, "Email dan kata sandi wajib diisi."),
});

const adminEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Format email admin tidak valid."));
const adminRoleSchema = z.enum(["superadmin", "admin"]).optional().default("admin");

export const adminInputSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("google"), email: adminEmailSchema, role: adminRoleSchema }),
  z.object({
    mode: z.literal("password"),
    role: adminRoleSchema,
    email: adminEmailSchema,
    fullName: z
      .string()
      .trim()
      .min(2, "Nama lengkap admin harus diisi minimal 2 karakter.")
      .max(120),
    password: z.string().min(8, "Kata sandi minimal 8 karakter."),
  }),
]);

export const OWNER_KEY_MIN_LENGTH = 8;
export const OWNER_KEY_MAX_LENGTH = 16;

export const ownerKeyInputSchema = z
  .object({
    mode: z.enum(["new", "existing"]),
    umkmId: idSchema.optional().or(z.literal("")),
    ownerLabel: z.string().trim().max(120, "Catatan maksimal 120 karakter.").optional().default(""),
    // Empty means "generate one for me".
    customKey: z.string().trim().optional().default(""),
    expiresInDays: z.number().int().min(1).max(365).nullable().default(null),
  })
  .refine((value) => value.mode === "new" || Boolean(value.umkmId), {
    message: "Pilih UMKM yang akan diberi kunci.",
    path: ["umkmId"],
  });

export type OwnerKeyInput = z.output<typeof ownerKeyInputSchema>;

export const ownerKeyEntrySchema = z.object({
  key: z.string().trim().min(1, "Masukkan kunci akses."),
});
