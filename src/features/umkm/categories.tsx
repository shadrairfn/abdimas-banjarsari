import { CakeSlice, CookingPot, Cookie, CupSoda, type LucideIcon } from "lucide-react";
import type { UmkmSubCategory } from "@/features/umkm/types";

export const CATEGORY_CONFIG: Record<UmkmSubCategory, {
  slug: string;
  color: string;
  background: string;
  icon: LucideIcon;
}> = {
  Camilan: { slug: "camilan", color: "#9a5d08", background: "#fff3d7", icon: Cookie },
  Makanan: { slug: "makanan", color: "#b45309", background: "#fee8da", icon: CookingPot },
  Minuman: { slug: "minuman", color: "#0f766e", background: "#dff5f1", icon: CupSoda },
  "Kue & Roti": { slug: "kue-dan-roti", color: "#7e22ce", background: "#f3e8ff", icon: CakeSlice },
};

export function CategoryIcon({ category, size = 21 }: { category: UmkmSubCategory; size?: number }) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;
  return <Icon size={size} strokeWidth={2.25} aria-hidden="true" />;
}

export function categoryMarkerSvg(category: UmkmSubCategory) {
  const config = CATEGORY_CONFIG[category];
  const paths: Record<UmkmSubCategory, string> = {
    Camilan: '<circle cx="18" cy="18" r="8"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="21" cy="18" r="1" fill="currentColor"/><circle cx="17" cy="22" r="1" fill="currentColor"/>',
    Makanan: '<path d="M10 17h16c0 6-3.6 9-8 9s-8-3-8-9Z"/><path d="M13 14c1-3 2-5 5-7M18 14c0-3 2-5 4-7"/>',
    Minuman: '<path d="M12 10h12l-1.5 16h-9Z"/><path d="m18 10 4-5M14 15h8"/>',
    "Kue & Roti": '<path d="M10 22c0-6 3-11 8-11s8 5 8 11Z"/><path d="M14 19c1-3 2-5 4-8M19 19c1-3 2-5 3-6"/>',
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44"><path fill="${config.color}" stroke="white" stroke-width="2" d="M18 1C8.6 1 1 8.5 1 17.8 1 30 18 43 18 43s17-13 17-25.2C35 8.5 27.4 1 18 1Z"/><g transform="translate(0 1)" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[category]}</g></svg>`;
}
