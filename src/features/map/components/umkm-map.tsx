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
  userLocation?: { latitude: number; longitude: number } | null;
  radiusKm: number | null;
  fitRequest: {
    key: number;
    center: { latitude: number; longitude: number };
    radiusKm: number | null;
    zoom?: number;
  };
  theme?: "light" | "dark";
  onSelect: (id: string) => void;
  onViewportChange: (viewport: {
    center: { latitude: number; longitude: number };
    bounds: { north: number; south: number; east: number; west: number };
  }, userInitiated: boolean) => void;
  onMovingChange: (moving: boolean) => void;
  onZoomRadiusChange?: (radiusKm: number) => void;
  onUserZoom?: (visibleRadiusKm: number) => void;
}

const mapStyle: StyleSpecification = {
  version: 8,
  sources: {
    "openstreetmap": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "openstreetmap",
      type: "raster",
      source: "openstreetmap",
      paint: {
        "raster-saturation": -0.06,
        "raster-contrast": 0.04,
        "raster-brightness-min": 0.05,
        "raster-brightness-max": 0.98,
      },
    },
  ],
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
  userLocation,
  radiusKm,
  fitRequest,
  theme = "light",
  onSelect,
  onViewportChange,
  onMovingChange,
  onZoomRadiusChange,
  onUserZoom,
}: UmkmMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const userMarkerRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const onViewportChangeRef = useRef(onViewportChange);
  const onMovingChangeRef = useRef(onMovingChange);
  const onZoomRadiusChangeRef = useRef(onZoomRadiusChange);
  const onUserZoomRef = useRef(onUserZoom);
  const hasSelectionRef = useRef(Boolean(selectedId));
  const markerItemsRef = useRef(items);
  const themeRef = useRef(theme);
  const circleData = useMemo<FeatureCollection<Polygon>>(
    () => radiusKm === null ? { type: "FeatureCollection", features: [] } : radiusPolygon(center, radiusKm),
    [center, radiusKm],
  );
  const initialCircleData = useRef(circleData);
  const initialCenter = useRef(center);
  const markerItemsKey = useMemo(
    () => items
      .map((item) => `${item.id}:${item.latitude}:${item.longitude}:${item.subCategory}:${item.locationStatus}`)
      .sort()
      .join("|"),
    [items],
  );

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onViewportChangeRef.current = onViewportChange; }, [onViewportChange]);
  useEffect(() => { onMovingChangeRef.current = onMovingChange; }, [onMovingChange]);
  useEffect(() => { onZoomRadiusChangeRef.current = onZoomRadiusChange; }, [onZoomRadiusChange]);
  useEffect(() => { onUserZoomRef.current = onUserZoom; }, [onUserZoom]);
  useEffect(() => { hasSelectionRef.current = Boolean(selectedId); }, [selectedId]);
  useEffect(() => { markerItemsRef.current = items; }, [items]);
  useEffect(() => { themeRef.current = theme; }, [theme]);

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
    const reportViewport = (userInitiated: boolean) => {
      const mapCenter = map.getCenter();
      const bounds = map.getBounds();
      const currentCenter = { latitude: mapCenter.lat, longitude: mapCenter.lng };
      const currentBounds = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      };
      onViewportChangeRef.current({
        center: currentCenter,
        bounds: currentBounds,
      }, userInitiated);

      if (onZoomRadiusChangeRef.current) {
        // Calculate realtime visible radius: distance from center to northern edge (vertical radius)
        const latDeltaKm = Math.abs(bounds.getNorth() - mapCenter.lat) * 111.32;
        onZoomRadiusChangeRef.current(Number(latDeltaKm.toFixed(1)));
      }
    };
    let moveThrottleTimeout: ReturnType<typeof setTimeout> | null = null;
    map.on("movestart", () => onMovingChangeRef.current(true));
    map.on("move", (event) => {
      if (event.originalEvent && !moveThrottleTimeout) {
        moveThrottleTimeout = setTimeout(() => {
          moveThrottleTimeout = null;
          reportViewport(true);
        }, 80);
      }
    });
    map.on("zoom", (event) => {
      const isUser = Boolean(event.originalEvent);
      reportViewport(isUser);
      if (isUser && onUserZoomRef.current) {
        const bounds = map.getBounds();
        const mapCenter = map.getCenter();
        const latDeltaKm = Math.abs(bounds.getNorth() - mapCenter.lat) * 111.32;
        onUserZoomRef.current(Number(latDeltaKm.toFixed(1)));
      }
    });
    map.on("wheel", () => {
      if (onUserZoomRef.current) {
        const bounds = map.getBounds();
        const mapCenter = map.getCenter();
        const latDeltaKm = Math.abs(bounds.getNorth() - mapCenter.lat) * 111.32;
        onUserZoomRef.current(Number(latDeltaKm.toFixed(1)));
      }
    });
    map.on("moveend", (event) => {
      if (moveThrottleTimeout) {
        clearTimeout(moveThrottleTimeout);
        moveThrottleTimeout = null;
      }
      reportViewport(Boolean(event.originalEvent));
      onMovingChangeRef.current(false);
    });
    map.on("load", () => {
      const isDark = themeRef.current === "dark";
      const radiusColor = isDark ? "#f97316" : "#0f766e";
      map.addSource("radius", { type: "geojson", data: initialCircleData.current });
      map.addLayer({ id: "radius-fill", type: "fill", source: "radius", paint: { "fill-color": radiusColor, "fill-opacity": isDark ? 0.12 : 0.08 } });
      map.addLayer({ id: "radius-line", type: "line", source: "radius", paint: { "line-color": radiusColor, "line-width": 2, "line-dasharray": [3, 2] } });
      reportViewport(false);
    });
    mapRef.current = map;
    return () => {
      if (moveThrottleTimeout) {
        clearTimeout(moveThrottleTimeout);
      }
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      markers.forEach((marker) => marker.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const updateThemeLayers = () => {
      const isDark = theme === "dark";
      const radiusColor = isDark ? "#f97316" : "#0f766e";
      if (map.getLayer("radius-fill")) {
        map.setPaintProperty("radius-fill", "fill-color", radiusColor);
        map.setPaintProperty("radius-fill", "fill-opacity", isDark ? 0.12 : 0.08);
      }
      if (map.getLayer("radius-line")) {
        map.setPaintProperty("radius-line", "line-color", radiusColor);
      }
    };
    if (map.isStyleLoaded()) {
      updateThemeLayers();
    } else {
      map.once("load", updateThemeLayers);
    }
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    if (!userMarkerRef.current) {
      const element = document.createElement("div");
      element.className = "user-live-marker";
      element.setAttribute("aria-label", "Lokasi Anda saat ini");
      element.innerHTML = '<span class="user-live-pulse"></span><span class="user-live-dot"></span>';
      userMarkerRef.current = new Marker({ element })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userLocation.longitude, userLocation.latitude]);
    }
  }, [userLocation]);

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
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        },
        duration: 700,
        maxZoom: 18,
      });
    }
  }, [fitRequest]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markerItems = markerItemsRef.current;
    const activeIds = new Set(markerItems.map((item) => item.id));
    markersRef.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    for (const item of markerItems) {
      const existingMarker = markersRef.current.get(item.id);
      if (existingMarker) {
        existingMarker.setLngLat([item.longitude, item.latitude]);
        continue;
      }
      const element = document.createElement("button");
      element.type = "button";
      element.className = `umkm-map-marker status-${item.locationStatus}`;
      element.innerHTML = `<span class="umkm-map-marker-icon">${categoryMarkerSvg(item.subCategory)}</span>`;
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
  }, [markerItemsKey]);

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

  return (
    <div
      ref={containerRef}
      className={`map-canvas ${theme === "dark" ? "map-dark" : ""}`}
      aria-label="Peta lokasi UMKM"
    />
  );
}

export const UmkmMap = UmkmMapWithMarkers;
