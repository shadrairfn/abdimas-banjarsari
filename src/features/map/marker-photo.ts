import { coverPhoto } from "@/features/umkm/cover-photo";
import type { Umkm } from "@/features/umkm/types";

/** Attach a photo that is shown beside the selected marker in either map renderer. */
export function appendMarkerPhoto(element: HTMLElement, item: Umkm) {
  const photoUrl = coverPhoto(item);
  if (!photoUrl) {
    return;
  }

  const preview = document.createElement("span");
  preview.className = "marker-photo";
  const image = document.createElement("img");
  image.src = photoUrl;
  image.alt = `Foto ${item.brand}`;
  image.loading = "lazy";
  image.draggable = false;
  image.addEventListener("error", () => preview.remove(), { once: true });
  preview.append(image);
  element.append(preview);
}
