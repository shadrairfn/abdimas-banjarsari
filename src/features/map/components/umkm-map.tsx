"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AttributionControl,
  type GeoJSONSource,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  ScaleControl,
  type StyleSpecification,
} from "maplibre-gl";
import type { FeatureCollection, Polygon } from "geojson";
import { categoryMarkerSvg } from "@/features/umkm/categories";
import type { Umkm } from "@/features/umkm/types";

interface UmkmMapProps {
  items: Umkm[];
  selectedId: string | null;
  center: { latitude: number; longitude: number };
  radiusKm: number | null;
  fitRequest: {
    key: number;
    center: { latitude: number; longitude: number };
    radiusKm: number | null;
    zoom?: number;
  };
  onSelect: (id: string) => void;
  onViewportChange: (viewport: {
    center: { latitude: number; longitude: number };
    bounds: { north: number; south: number; east: number; west: number };
  }, userInitiated: boolean) => void;
  onMovingChange: (moving: boolean) => void;
}

const mapStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{
    id: "osm",
    type: "raster",
    source: "osm",
    paint: { "raster-saturation": -0.18, "raster-contrast": 0.03 },
  }],
};

function radiusPolygon(center: UmkmMapProps["center"], radiusKm: number): FeatureCollection<Polygon> {
  const points: [number, number][] = [];
  const latitudeRadians = (center.latitude * Math.PI) / 180;
  for (let index = 0; index <= 72; index += 1) {
    const angle = (index / 72) * Math.PI * 2;
    points.push([
      center.longitude + (radiusKm / (111.32 * Math.cos(latitudeRadians))) * Math.cos(angle),
      center.latitude + (radiusKm / 111.32) * Math.sin(angle),
    ]);
  }
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [points] } }],
  };
}

function radiusBounds(center: UmkmMapProps["center"], radiusKm: number): [[number, number], [number, number]] {
  const latitudeDelta = radiusKm / 111.32;
  const longitudeDelta = radiusKm / (111.32 * Math.cos((center.latitude * Math.PI) / 180));
  return [
    [center.longitude - longitudeDelta, center.latitude - latitudeDelta],
    [center.longitude + longitudeDelta, center.latitude + latitudeDelta],
  ];
}

function UmkmMapWithMarkers({
  items,
  selectedId,
  center,
  radiusKm,
  fitRequest,
  onSelect,
  onViewportChange,
  onMovingChange,
}: UmkmMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const onViewportChangeRef = useRef(onViewportChange);
  const onMovingChangeRef = useRef(onMovingChange);
  const hasSelectionRef = useRef(Boolean(selectedId));
  const circleData = useMemo<FeatureCollection<Polygon>>(
    () => radiusKm === null ? { type: "FeatureCollection", features: [] } : radiusPolygon(center, radiusKm),
    [center, radiusKm],
  );
  const initialCircleData = useRef(circleData);
  const initialCenter = useRef(center);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onViewportChangeRef.current = onViewportChange; }, [onViewportChange]);
  useEffect(() => { onMovingChangeRef.current = onMovingChange; }, [onMovingChange]);
  useEffect(() => { hasSelectionRef.current = Boolean(selectedId); }, [selectedId]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const markers = markersRef.current;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: mapStyle,
      center: [initialCenter.current.longitude, initialCenter.current.latitude],
      zoom: 14.1,
      minZoom: 10,
      maxZoom: 19,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new AttributionControl({ compact: true }), "bottom-left");
    map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");
    const reportViewport = (userInitiated: boolean) => {
      const mapCenter = map.getCenter();
      const bounds = map.getBounds();
      onViewportChangeRef.current({
        center: { latitude: mapCenter.lat, longitude: mapCenter.lng },
        bounds: { north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest() },
      }, userInitiated);
    };
    map.on("movestart", () => onMovingChangeRef.current(true));
    map.on("moveend", (event) => {
      reportViewport(Boolean(event.originalEvent));
      onMovingChangeRef.current(false);
    });
    map.on("load", () => {
      map.addSource("radius", { type: "geojson", data: initialCircleData.current });
      map.addLayer({ id: "radius-fill", type: "fill", source: "radius", paint: { "fill-color": "#0f766e", "fill-opacity": 0.08 } });
      map.addLayer({ id: "radius-line", type: "line", source: "radius", paint: { "line-color": "#0f766e", "line-width": 2, "line-dasharray": [3, 2] } });
      reportViewport(false);
    });
    mapRef.current = map;
    return () => {
      markers.forEach((marker) => marker.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (fitRequest.zoom !== undefined) {
      map.easeTo({
        center: [fitRequest.center.longitude, fitRequest.center.latitude],
        zoom: fitRequest.zoom,
        duration: 700,
      });
    } else if (fitRequest.radiusKm === null) {
      map.easeTo({ center: [fitRequest.center.longitude, fitRequest.center.latitude], duration: 700 });
    } else {
      map.fitBounds(radiusBounds(fitRequest.center, fitRequest.radiusKm), {
        padding: {
          top: 76,
          right: 42,
          bottom: hasSelectionRef.current ? 210 : 72,
          left: 42,
        },
        duration: 700,
        maxZoom: 18,
      });
    }
  }, [fitRequest]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    for (const item of items) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = `umkm-map-marker status-${item.locationStatus}`;
      element.innerHTML = categoryMarkerSvg(item.subCategory);
      element.title = `${item.brand} · ${item.subCategory}`;
      element.setAttribute("aria-label", `Pilih ${item.brand}, kategori ${item.subCategory}`);
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(item.id);
      });
      const marker = new Marker({ element, anchor: "bottom" })
        .setLngLat([item.longitude, item.latitude])
        .addTo(map);
      markersRef.current.set(item.id, marker);
    }
  }, [items]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const updateRadius = () => (map.getSource("radius") as GeoJSONSource | undefined)?.setData(circleData);
    if (map.isStyleLoaded()) updateRadius();
    else map.once("load", updateRadius);
    return () => { map.off("load", updateRadius); };
  }, [circleData]);

  useEffect(() => {
    markersRef.current.forEach((marker, id) => marker.getElement().classList.toggle("selected", id === selectedId));
  }, [selectedId]);

  return <div ref={containerRef} className="map-canvas" aria-label="Peta lokasi UMKM" />;
}

export const UmkmMap = UmkmMapWithMarkers;
