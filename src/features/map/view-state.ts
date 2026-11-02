const STORAGE_KEY = "map_view_state";

export interface MapCamera {
  latitude: number;
  longitude: number;
  zoom: number;
}

// Everything the map page needs to look the same after the visitor comes back from a profile.
export interface SavedMapView {
  query: string;
  category: string;
  // "all", "viewport" or a radius in km.
  area: string | number;
  selectedId: string | null;
  detailOpen: boolean;
  center: { latitude: number; longitude: number };
  camera: MapCamera | null;
  carouselHidden: boolean;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCoordinates(value: unknown): value is { latitude: number; longitude: number } {
  const candidate = value as { latitude?: unknown; longitude?: unknown } | null;
  return Boolean(candidate) && isNumber(candidate?.latitude) && isNumber(candidate?.longitude);
}

function isCamera(value: unknown): value is MapCamera {
  return isCoordinates(value) && isNumber((value as { zoom?: unknown }).zoom);
}

/** Read the last map view of this browser tab, or null when there is none (or it is damaged). */
export function loadMapView(): SavedMapView | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const value = JSON.parse(raw) as Partial<SavedMapView>;
    const isAreaValid = typeof value.area === "number" || typeof value.area === "string";
    if (!isCoordinates(value.center) || !isAreaValid) return null;

    return {
      query: typeof value.query === "string" ? value.query : "",
      category: typeof value.category === "string" ? value.category : "Semua",
      area: value.area as string | number,
      selectedId: typeof value.selectedId === "string" ? value.selectedId : null,
      detailOpen: value.detailOpen === true,
      center: value.center,
      camera: isCamera(value.camera) ? value.camera : null,
      carouselHidden: value.carouselHidden === true,
    };
  } catch {
    return null;
  }
}

export function saveMapView(view: SavedMapView) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(view));
  } catch {
    // Private windows or blocked storage: the map simply starts fresh next time.
  }
}
