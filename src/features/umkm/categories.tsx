import { CakeSlice, CookingPot, Cookie, CupSoda, type LucideIcon } from "lucide-react";
import type { UmkmSubCategory } from "@/features/umkm/types";

const KNOWN_CATEGORY_CONFIG: Record<UmkmSubCategory, {
  slug: string;
  // Class from globals.css that sets the category colour (--c) for pins.
  pinClass: string;
  icon: LucideIcon;
  // Same shapes as `icon`, as plain markup for map markers that are built outside React.
  iconPaths: string;
}> = {
  Camilan: {
    slug: "camilan",
    pinClass: "c-cam",
    icon: Cookie,
    iconPaths: '<path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/>',
  },
  Makanan: {
    slug: "makanan",
    pinClass: "c-mak",
    icon: CookingPot,
    iconPaths: '<path d="M2 12h20"/><path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="m4 8 16-4"/><path d="m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8"/>',
  },
  Minuman: {
    slug: "minuman",
    pinClass: "c-min",
    icon: CupSoda,
    iconPaths: '<path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8"/><path d="M5 8h14"/><path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"/><path d="m12 8 1-6h2"/>',
  },
  "Kue & Roti": {
    slug: "kue-dan-roti",
    pinClass: "c-kue",
    icon: CakeSlice,
    iconPaths: '<path d="M3 20h18"/><path d="M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/><path d="M5 16c2 0 2 1 3.5 1S11 16 12 16s2 1 3.5 1S17 16 19 16"/><path d="M12 12V8"/><path d="M12 5v.01"/>',
  },
};

export const CATEGORY_CONFIG = new Proxy(KNOWN_CATEGORY_CONFIG, { get(target, key: string) { return Object.prototype.hasOwnProperty.call(target, key) ? target[key as UmkmSubCategory] : target.Makanan; } });

export function CategoryIcon({ category, className = "i" }: { category: UmkmSubCategory; className?: string }) {
  const Icon = CATEGORY_CONFIG[category].icon;
  return <Icon className={className} aria-hidden="true" />;
}

/** Inline SVG markup of a category icon, sized by the `.i` class of globals.css. */
export function categoryIconSvg(category: UmkmSubCategory, className = "i") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${CATEGORY_CONFIG[category].iconPaths}</svg>`;
}
