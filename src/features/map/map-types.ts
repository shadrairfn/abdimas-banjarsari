import type { Umkm } from "@/features/umkm/types";
import type { Theme } from "@/lib/theme/use-theme";
export interface MapControls {
  zoomIn: () => void;
  zoomOut: () => void;
}

interface Padding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface UmkmMapProps {
  items: Umkm[];
  selectedId: string | null;
  center: { latitude: number; longitude: number };
  userLocation?: { latitude: number; longitude: number } | null;
  radiusKm: number | null;
  // Where the map starts, instead of `center`, when the last view is restored.
  initialCamera?: { latitude: number; longitude: number; zoom: number } | null;
  fitRequest: {
    key: number;
    center: { latitude: number; longitude: number };
    radiusKm: number | null;
    zoom?: number;
    // Zoom in to at least this level, but never zoom out.
    minZoom?: number;
    // Fit these [west, south, east, north] bounds, e.g. all search results.
    bounds?: [number, number, number, number];
    padding?: Padding;
    // Jump without animation.
    instant?: boolean;
    // Drop this request while the map is already moving, e.g. a GPS update during a fly-to.
    skipIfMoving?: boolean;
  };
  theme?: Theme;
  onSelect: (id: string) => void;
  onViewportChange: (viewport: {
    center: { latitude: number; longitude: number };
    zoom: number;
    bounds: { north: number; south: number; east: number; west: number };
  }, userInitiated: boolean) => void;
  onMovingChange: (moving: boolean) => void;
  onZoomRadiusChange?: (radiusKm: number) => void;
  onUserZoom?: (visibleRadiusKm: number) => void;
  onReady?: (controls: MapControls) => void;
}


