"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker } from "maplibre-gl";

export function CoordinatePicker({ latitude, longitude, onChange }: {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const initialCoordinates = useRef({ latitude, longitude });
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: { version: 8, sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } }, layers: [{ id: "osm", type: "raster", source: "osm" }] },
      center: [initialCoordinates.current.longitude, initialCoordinates.current.latitude], zoom: 16,
    });
    const marker = new Marker({ color: "#0f766e", draggable: true }).setLngLat([initialCoordinates.current.longitude, initialCoordinates.current.latitude]).addTo(map);
    marker.on("dragend", () => { const point = marker.getLngLat(); onChangeRef.current(point.lat, point.lng); });
    map.on("click", (event) => { marker.setLngLat(event.lngLat); onChangeRef.current(event.lngLat.lat, event.lngLat.lng); });
    mapRef.current = map;
    markerRef.current = marker;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);

  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude]);
  }, [latitude, longitude]);

  return <div ref={containerRef} className="coordinate-map" aria-label="Pilih titik lokasi UMKM" />;
}
