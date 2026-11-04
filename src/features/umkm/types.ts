export type UmkmCategory = "Kuliner";

export const UMKM_SUB_CATEGORIES = ["Camilan", "Makanan", "Minuman", "Kue & Roti"] as const;
export type UmkmSubCategory = string;

export const SOCIAL_PLATFORMS = [
  "Instagram",
  "TikTok",
  "Facebook",
  "YouTube",
  "Situs web",
  "Lainnya",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface SocialLink {
  platform: SocialPlatform;
  customName?: string;
  handle: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  price: number | null;
  priceLabel: string;
  unit: string;
  description: string;
  photoUrl: string;
}

export interface Umkm {
  id: string;
  sourceNo: number;
  ownerName: string;
  brand: string;
  products: string;
  address: string;
  category: UmkmCategory;
  subCategory: UmkmSubCategory;
  latitude: number;
  longitude: number;
  priceDescription?: string;
  catalog?: CatalogProduct[];
  featuredProduct?: string;
  notes?: string;
  googleMapsUrl?: string;
  contact?: string;
  // Legacy single link, kept as the first of `socials` for older readers.
  website?: string;
  socials: SocialLink[];
  openingHours?: string;
  closingHours?: string;
  photos?: string[];
}

export const BANJARSARI_CENTER: { latitude: number; longitude: number } = {
  latitude: -7.238,
  longitude: 107.8395,
};
