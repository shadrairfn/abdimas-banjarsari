import type { SocialLink, SocialPlatform, Umkm } from "@/features/umkm/types";

const EN_DASH = "–";

function hasLowercase(value: string) {
  return value !== value.toLocaleUpperCase("id-ID");
}

function capitalize(word: string) {
  return word.charAt(0).toLocaleUpperCase("id-ID") + word.slice(1).toLocaleLowerCase("id-ID");
}

/**
 * The imported data is written in capital letters. Text that has no lowercase letter at all
 * is shown in title case ("title") or sentence case ("sentence"); text typed by an admin is kept as it is.
 */
export function displayText(value: string, mode: "title" | "sentence" = "title") {
  if (!value || hasLowercase(value)) {
    return value;
  }

  if (mode === "sentence") {
    return capitalize(value);
  }

  return value
    .split(/(\s+)/)
    .map((part) => (/^(RT|RW)$/.test(part) ? part : capitalize(part)))
    .join("");
}

/** Short place name for lists: "KP. CILOA RT 001 ..." becomes "Kp. Ciloa". */
export function villageName(address: string) {
  const match = address.match(/KP\.?\s*([A-Za-z ]+?)(?=\s+RT\b|\s+RW\b|\s+BANJARSARI\b|\s*,|$)/i);
  if (!match) {
    return "Banjarsari";
  }

  return `Kp. ${match[1].trim().split(/\s+/).map(capitalize).join(" ")}`;
}

/** "08:00 – 17:00 WIB", "Buka 24 jam", or null when the hours are unknown. */
export function formatOperatingHours(opening?: string, closing?: string) {
  const open = (opening ?? "").trim();
  const close = (closing ?? "").trim();
  if (!open && !close) {
    return null;
  }

  if (open && open === close) {
    return "Buka 24 jam";
  }

  return `${open || "00:00"} ${EN_DASH} ${close || "24:00"} WIB`;
}

/** Display a distance in kilometers using Indonesian number formatting. */
export function formatDistance(km: number) {
  return `${km.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

/** Display a latitude/longitude pair at the application's standard precision. */
export function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

/** Build an external Google Maps directions link for a business destination. */
export function directionsUrl(item: Pick<Umkm, "latitude" | "longitude">) {
  return `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`;
}

/** Build a WhatsApp contact URL from the stored phone number. */
export function whatsappUrl(contact: string) {
  return `https://wa.me/${contact.replace(/\D/g, "")}`;
}

/** Normalize a website address for use as an external link. */
export function externalUrl(website: string) {
  return website.startsWith("http") ? website : `https://${website}`;
}

const SOCIAL_BASE_URLS: Partial<Record<SocialPlatform, string>> = {
  Instagram: "https://instagram.com/",
  TikTok: "https://www.tiktok.com/@",
  Facebook: "https://facebook.com/",
  YouTube: "https://www.youtube.com/@",
};

/** Link of one social account: "@warungbuani" on Instagram opens instagram.com/warungbuani. */
export function socialUrl(link: SocialLink) {
  const handle = link.handle.trim();
  if (handle.startsWith("http")) {
    return handle;
  }

  const base = SOCIAL_BASE_URLS[link.platform];

  return base ? `${base}${handle.replace(/^@/, "")}` : externalUrl(handle);
}

/** The text shown for a social account, without the protocol. */
export function socialLabel(link: SocialLink) {
  return link.handle.trim().replace(/^https?:\/\//, "");
}

/** "Instagram @warungbuani, TikTok @warungbuani.id" for plain-text uses such as comparing. */
export function socialsText(socials: SocialLink[]) {
  return socials.map((link) => `${socialPlatformLabel(link)} ${socialLabel(link)}`).join(", ");
}

/** Use a custom platform name when the social account is classified as Other. */
export function socialPlatformLabel(link: SocialLink) {
  return link.platform === "Lainnya" ? link.customName || "Lainnya" : link.platform;
}
