"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { applyMapPalette, MAP_STYLE_URL } from "@/features/map/map-style";
import { categoryIconSvg, CATEGORY_CONFIG } from "@/features/umkm/categories";
import type { Umkm } from "@/features/umkm/types";
import { useTheme } from "@/lib/theme/use-theme";

const LOCATION_ZOOM = 15;

/** Small read-only map with the selected pin of the design, used on the profile page. */
export function LocationMap({ item }: { item: Pick<Umkm, "latitude" | "longitude" | "subCategory" | "locationStatus"> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  const { latitude, longitude, subCategory, locationStatus } = item;

  useEffect(() => {
    themeRef.current = theme;
    if (mapRef.current?.isStyleLoaded()) applyMapPalette(mapRef.current, theme);
  }, [theme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    import("maplibre-gl").then(({ Map: Map2, Marker, setWorkerUrl }) => {
      if (cancelled) return;
      setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const map = new Map2({
        container,
        style: MAP_STYLE_URL,
        center: [longitude, latitude],
        zoom: LOCATION_ZOOM,
        interactive: false,
        attributionControl: false,
      });
      map.on("style.load", () => applyMapPalette(map, themeRef.current));

      const pin = document.createElement("div");
      pin.className = `pin ${CATEGORY_CONFIG[subCategory].pinClass}${locationStatus === "verified" ? "" : " est"} sel`;
      pin.innerHTML = categoryIconSvg(subCategory);
      pin.querySelector("svg")?.setAttribute("style", "width:22px;height:22px");
      const marker = new Marker({ element: pin, anchor: "center" }).setLngLat([longitude, latitude]).addTo(map);

      mapRef.current = map;
      cleanup = () => {
        marker.remove();
        map.remove();
        mapRef.current = null;
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [latitude, longitude, subCategory, locationStatus]);

  return <div ref={containerRef} className="loc-map" role="img" aria-label="Peta lokasi usaha" />;
}
