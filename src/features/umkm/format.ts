import type { Umkm } from "@/features/umkm/types";

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
  if (!value || hasLowercase(value)) return value;

  if (mode === "sentence") return capitalize(value);

  return value
    .split(/(\s+)/)
    .map((part) => (/^(RT|RW)$/.test(part) ? part : capitalize(part)))
    .join("");
}

/** Short place name for lists: "KP. CILOA RT 001 ..." becomes "Kp. Ciloa". */
export function villageName(address: string) {
  const match = address.match(/KP\.?\s*([A-Za-z ]+?)(?=\s+RT\b|\s+RW\b|\s+BANJARSARI\b|\s*,|$)/i);
  if (!match) return "Banjarsari";

  return `Kp. ${match[1].trim().split(/\s+/).map(capitalize).join(" ")}`;
}

/** "08:00 – 17:00 WIB", "Buka 24 jam", or null when the hours are unknown. */
export function formatOperatingHours(opening?: string, closing?: string) {
  const open = (opening ?? "").trim();
  const close = (closing ?? "").trim();
  if (!open && !close) return null;

  if (open && open === close) return "Buka 24 jam";

  return `${open || "00:00"} ${EN_DASH} ${close || "24:00"} WIB`;
}

export function formatDistance(km: number) {
  return `${km.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

export function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export function directionsUrl(item: Pick<Umkm, "latitude" | "longitude">) {
  return `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`;
}

export function whatsappUrl(contact: string) {
  return `https://wa.me/${contact.replace(/\D/g, "")}`;
}

export function externalUrl(website: string) {
  return website.startsWith("http") ? website : `https://${website}`;
}
