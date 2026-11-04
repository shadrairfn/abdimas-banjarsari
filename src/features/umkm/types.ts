export type UmkmCategory = "Kuliner";

export const UMKM_SUB_CATEGORIES = ["Camilan", "Makanan", "Minuman", "Kue & Roti"] as const;
export type UmkmSubCategory = (typeof UMKM_SUB_CATEGORIES)[number];


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
  contact?: string;
  website?: string;
  openingHours?: string;
  closingHours?: string;
  photos?: string[];
}

export const BANJARSARI_CENTER: { latitude: number; longitude: number } = {
  latitude: -7.238,
  longitude: 107.8395,
};
