"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import { Minus, Plus } from "lucide-react";
import { applyMapPalette, MAP_STYLE_URL } from "@/features/map/map-style";
import { categoryIconSvg, CATEGORY_CONFIG } from "@/features/umkm/categories";
import type { UmkmSubCategory } from "@/features/umkm/types";
import { useTheme } from "@/lib/theme/use-theme";

// Copied to public/ by scripts/copy-maplibre-worker.mjs.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const PICKER_ZOOM = 16;

interface CoordinatePickerProps {
  latitude: number;
  longitude: number;
  subCategory: UmkmSubCategory;
  onChange: (latitude: number, longitude: number) => void;
}

function applyPinStyle(element: HTMLElement, subCategory: UmkmSubCategory) {
  element.className = `pin ${CATEGORY_CONFIG[subCategory].pinClass} sel`;
  element.innerHTML = categoryIconSvg(subCategory);
  element.querySelector("svg")?.setAttribute("style", "width:22px;height:22px");
}

/** Map where the admin clicks or drags the draggable pin to set the coordinates of a UMKM. */
export function CoordinatePicker({ latitude, longitude, subCategory, onChange }: CoordinatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);
  const initialCoordinates = useRef({ latitude, longitude });
  const { theme } = useTheme();
  const themeRef = useRef(theme);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    themeRef.current = theme;
    if (mapRef.current?.isStyleLoaded()) applyMapPalette(mapRef.current, theme);
  }, [theme]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [initialCoordinates.current.longitude, initialCoordinates.current.latitude],
      zoom: PICKER_ZOOM,
      attributionControl: false,
    });
    map.on("style.load", () => applyMapPalette(map, themeRef.current));

    const pin = document.createElement("div");
    pin.style.cursor = "grab";
    pinRef.current = pin;
    const marker = new Marker({ element: pin, draggable: true })
      .setLngLat([initialCoordinates.current.longitude, initialCoordinates.current.latitude])
      .addTo(map);

    marker.on("dragend", () => {
      const point = marker.getLngLat();
      onChangeRef.current(point.lat, point.lng);
    });
    map.on("click", (event) => {
      marker.setLngLat(event.lngLat);
      onChangeRef.current(event.lngLat.lat, event.lngLat.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      pinRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (pinRef.current) applyPinStyle(pinRef.current, subCategory);
  }, [subCategory]);

  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude]);
    const map = mapRef.current;
    if (map && !map.getBounds().contains([longitude, latitude])) {
      map.easeTo({ center: [longitude, latitude], duration: 500 });
    }
  }, [latitude, longitude]);

  return (
    <div className="loc-map picker" aria-label="Pilih titik lokasi UMKM">
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <div className="fcard" style={{ position: "absolute", right: 8, top: 8, display: "flex", flexDirection: "column", zIndex: 5 }}>
        <button type="button" className="btn ic sm g" aria-label="Perbesar" title="Perbesar" onClick={() => mapRef.current?.zoomIn()}>
          <Plus className="i sm" />
        </button>
        <button type="button" className="btn ic sm g" aria-label="Perkecil" title="Perkecil" onClick={() => mapRef.current?.zoomOut()}>
          <Minus className="i sm" />
        </button>
      </div>
    </div>
  );
}
