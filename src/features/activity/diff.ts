import type { ActivityChange } from "@/features/activity/types";
import { catalogText } from "@/features/umkm/catalog";
import { formatOperatingHours, socialsText } from "@/features/umkm/format";
import type { Umkm } from "@/features/umkm/types";

const EMPTY = "—";
const COORDINATE_TOLERANCE = 1e-6;

type Reader = (item: Umkm) => string;

// Every field that is shown in the log, in the order of the form.
const FIELDS: { field: string; label: string; read: Reader }[] = [
  { field: "name", label: "Nama usaha", read: (item) => item.brand },
  { field: "subCategory", label: "Kategori", read: (item) => item.subCategory },
  { field: "ownerName", label: "Pemilik", read: (item) => item.ownerName },
  { field: "products", label: "Produk", read: (item) => item.products },
  { field: "catalog", label: "Katalog produk", read: (item) => catalogText(item.catalog ?? []) },
  { field: "priceDescription", label: "Harga produk", read: (item) => item.priceDescription ?? "" },
  {
    field: "featuredProduct",
    label: "Produk unggulan",
    read: (item) => item.featuredProduct ?? "",
  },
  { field: "notes", label: "Catatan", read: (item) => item.notes ?? "" },
  { field: "googleMapsUrl", label: "Tautan Google Maps", read: (item) => item.googleMapsUrl ?? "" },
  { field: "address", label: "Alamat", read: (item) => item.address },
  { field: "contact", label: "WhatsApp", read: (item) => item.contact ?? "" },
  { field: "socials", label: "Media sosial", read: (item) => socialsText(item.socials) },
  {
    field: "hours",
    label: "Jam buka",
    read: (item) => formatOperatingHours(item.openingHours, item.closingHours) ?? "",
  },
  {
    field: "photos",
    label: "Foto",
    read: (item) => (item.photos?.length ? `${item.photos.length} foto` : ""),
  },
];

function show(value: string) {
  return value.trim() || EMPTY;
}

function coordinatesText(item: Umkm) {
  return `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}`;
}

function coordinatesChanged(before: Umkm, after: Umkm) {
  return (
    Math.abs(before.latitude - after.latitude) > COORDINATE_TOLERANCE ||
    Math.abs(before.longitude - after.longitude) > COORDINATE_TOLERANCE
  );
}

/** The fields whose value differs between two versions of the same UMKM. */
export function diffUmkm(before: Umkm, after: Umkm): ActivityChange[] {
  const changes: ActivityChange[] = [];

  for (const { field, label, read } of FIELDS) {
    const previous = read(before);
    const next = read(after);

    // Photos are compared by their URLs, the shown value is only the count.
    const hasChanged =
      field === "photos"
        ? JSON.stringify(before.photos ?? []) !== JSON.stringify(after.photos ?? [])
        : previous !== next;

    if (hasChanged) {
      changes.push({ field, label, before: show(previous), after: show(next) });
    }
  }

  if (coordinatesChanged(before, after)) {
    changes.push({
      field: "coordinates",
      label: "Koordinat",
      before: coordinatesText(before),
      after: coordinatesText(after),
    });
  }

  return changes;
}

/** "Jam buka dan 2 lainnya" style one-liner for the list. */
export function summarizeChanges(changes: ActivityChange[]) {
  if (changes.length === 0) {
    return "Disimpan tanpa perubahan";
  }

  if (changes.length === 1) {
    return changes[0].label;
  }

  const names = changes.slice(0, 3).map((change) => change.label.toLocaleLowerCase("id-ID"));
  const rest = changes.length > 3 ? ` dan ${changes.length - 3} lainnya` : "";

  return `${changes.length} perubahan: ${names.join(", ")}${rest}`;
}
