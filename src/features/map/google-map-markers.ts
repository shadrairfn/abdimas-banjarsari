import { CATEGORY_CONFIG, categoryIconSvg } from "@/features/umkm/categories";
import { displayText } from "@/features/umkm/format";
import type { Umkm } from "@/features/umkm/types";

export type MapPinItem = Pick<Umkm, "latitude" | "longitude" | "subCategory">;

export function createGooglePin(item: MapPinItem, name?: string) {
  const element = document.createElement("div");
  element.className = "pin-marker google-pin";
  const pin = document.createElement("div");
  pin.className = `pin ${CATEGORY_CONFIG[item.subCategory].pinClass}`;
  pin.innerHTML = categoryIconSvg(item.subCategory);
  element.append(pin);
  if (name) {
    const label = document.createElement("span");
    label.className = "lab";
    label.textContent = displayText(name);
    element.append(label);
  }
  return element;
}

export function selectGooglePin(element: HTMLElement, selected: boolean) {
  element.classList.toggle("is-selected", selected);
  element.querySelector(".pin")?.classList.toggle("sel", selected);
  element.setAttribute("aria-pressed", String(selected));
}

export function googlePosition(point: { latitude: number; longitude: number }): google.maps.LatLngLiteral {
  return { lat: point.latitude, lng: point.longitude };
}
