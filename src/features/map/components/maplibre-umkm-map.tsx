"use client";

import type { FeatureCollection, Polygon } from "geojson";
import {
  AttributionControl,
  type GeoJSONSource,
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
} from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";

import { applyMapPalette, getRingColor, MAP_STYLE_URL } from "@/features/map/map-style";
import type { UmkmMapProps } from "@/features/map/map-types";
import { CATEGORY_CONFIG, categoryIconSvg } from "@/features/umkm/categories";
import { displayText } from "@/features/umkm/format";
import type { Umkm } from "@/features/umkm/types";

// Copied to public/ by scripts/copy-maplibre-worker.mjs, see the note there.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

// The radius circle fills about 75% of the map height, like the design, instead of touching the edges.
const FIT_MARGIN = 1.35;
// Space around search results so pins at the edge are not hidden under the floating cards.
const FIT_BOUNDS_PADDING = 48;

function radiusPolygon(
  center: UmkmMapProps["center"],
  radiusKm: number,
): FeatureCollection<Polygon> {
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
    features: [
      { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [points] } },
    ],
  };
}

function radiusBounds(
  center: UmkmMapProps["center"],
  radiusKm: number,
): [[number, number], [number, number]] {
  const latitudeDelta = radiusKm / 111.32;
  const longitudeDelta = radiusKm / (111.32 * Math.cos((center.latitude * Math.PI) / 180));

  return [
    [center.longitude - longitudeDelta, center.latitude - latitudeDelta],
    [center.longitude + longitudeDelta, center.latitude + latitudeDelta],
  ];
}

// Same structure as the pins of the design: .pin-marker > .pin (+ .lab).
function createMarkerElement(item: Umkm) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "pin-marker";
  element.title = `${displayText(item.brand)} · ${item.subCategory}`;
  element.setAttribute(
    "aria-label",
    `Pilih ${displayText(item.brand)}, kategori ${item.subCategory}`,
  );

  const pinClass = CATEGORY_CONFIG[item.subCategory].pinClass;
  const pin = document.createElement("div");
  pin.className = `pin ${pinClass}`;
  pin.innerHTML = categoryIconSvg(item.subCategory);

  const label = document.createElement("span");
  label.className = "lab";
  label.textContent = displayText(item.brand);

  element.append(pin, label);

  return element;
}

function setMarkerSelected(marker: Marker, isSelected: boolean) {
  const element = marker.getElement();
  const pin = element.querySelector(".pin");
  const label = element.querySelector<HTMLElement>(".lab");
  const icon = pin?.querySelector("svg");

  element.classList.toggle("is-selected", isSelected);
  element.style.zIndex = isSelected ? "6" : "2";
  pin?.classList.toggle("sel", isSelected);
  icon?.setAttribute("style", isSelected ? "width:22px;height:22px" : "");
  if (label) {
    label.style.fontWeight = isSelected ? "700" : "";
    label.style.fontSize = isSelected ? "12.5px" : "";
  }

  element.setAttribute("aria-pressed", String(isSelected));
}

function UmkmMapWithMarkers({
  items,
  selectedId,
  center,
  userLocation,
  radiusKm,
  initialCamera,
  fitRequest,
  theme = "light",
  onSelect,
  onViewportChange,
  onMovingChange,
  onZoomRadiusChange,
  onUserZoom,
  onReady,
}: UmkmMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const lastFitKeyRef = useRef<number | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const userMarkerRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const onViewportChangeRef = useRef(onViewportChange);
  const onMovingChangeRef = useRef(onMovingChange);
  const onZoomRadiusChangeRef = useRef(onZoomRadiusChange);
  const onUserZoomRef = useRef(onUserZoom);
  const onReadyRef = useRef(onReady);
  const markerItemsRef = useRef(items);
  const selectedIdRef = useRef(selectedId);
  const themeRef = useRef(theme);
  const circleData = useMemo<FeatureCollection<Polygon>>(
    () =>
      radiusKm === null
        ? { type: "FeatureCollection", features: [] }
        : radiusPolygon(center, radiusKm),
    [center, radiusKm],
  );
  const initialCircleData = useRef(circleData);
  const initialCenter = useRef(center);
  const initialView = useRef(initialCamera);
  const markerItemsKey = useMemo(
    () =>
      items
        .map(
          (item) =>
            `${item.id}:${item.latitude}:${item.longitude}:${item.subCategory}:${item.brand}`,
        )
        .sort()
        .join("|"),
    [items],
  );

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);
  useEffect(() => {
    onMovingChangeRef.current = onMovingChange;
  }, [onMovingChange]);
  useEffect(() => {
    onZoomRadiusChangeRef.current = onZoomRadiusChange;
  }, [onZoomRadiusChange]);
  useEffect(() => {
    onUserZoomRef.current = onUserZoom;
  }, [onUserZoom]);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    markerItemsRef.current = items;
  }, [items]);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const markers = markersRef.current;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: initialView.current
        ? [initialView.current.longitude, initialView.current.latitude]
        : [initialCenter.current.longitude, initialCenter.current.latitude],
      zoom: initialView.current?.zoom ?? 14.1,
      minZoom: 8,
      maxZoom: 19,
      attributionControl: false,
    });
    map.addControl(new AttributionControl({ compact: true }), "top-right");
    // The attribution stays available behind its "i" button instead of covering the map.
    // The control opens itself on creation and again on resize, so it is closed at every early moment.
    const collapseAttribution = () => {
      const attribution = map.getContainer().querySelector(".maplibregl-ctrl-attrib");
      attribution?.classList.remove("maplibregl-compact-show");
      attribution?.removeAttribute("open");
    };
    collapseAttribution();
    map.once("styledata", collapseAttribution);
    map.once("load", collapseAttribution);
    map.once("idle", collapseAttribution);
    onReadyRef.current?.({ zoomIn: () => map.zoomIn(), zoomOut: () => map.zoomOut() });

    const visibleRadiusKm = () => {
      const bounds = map.getBounds();

      return Number((Math.abs(bounds.getNorth() - map.getCenter().lat) * 111.32).toFixed(1));
    };
    const reportViewport = (isUserInitiated: boolean) => {
      const mapCenter = map.getCenter();
      const bounds = map.getBounds();
      onViewportChangeRef.current(
        {
          center: { latitude: mapCenter.lat, longitude: mapCenter.lng },
          zoom: map.getZoom(),
          bounds: {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
          },
        },
        isUserInitiated,
      );
      onZoomRadiusChangeRef.current?.(visibleRadiusKm());
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
      if (isUser) {
        onUserZoomRef.current?.(visibleRadiusKm());
      }
    });
    map.on("wheel", () => onUserZoomRef.current?.(visibleRadiusKm()));
    map.on("moveend", (event) => {
      if (moveThrottleTimeout) {
        clearTimeout(moveThrottleTimeout);
        moveThrottleTimeout = null;
      }

      reportViewport(Boolean(event.originalEvent));
      onMovingChangeRef.current(false);
    });
    map.on("style.load", () => applyMapPalette(map, themeRef.current));
    map.on("load", () => {
      const ringColor = getRingColor(themeRef.current);
      map.addSource("radius", { type: "geojson", data: initialCircleData.current });
      map.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "radius",
        paint: { "fill-color": ringColor, "fill-opacity": 0.05 },
      });
      map.addLayer({
        id: "radius-line",
        type: "line",
        source: "radius",
        layout: { "line-cap": "round" },
        paint: { "line-color": ringColor, "line-width": 1.6, "line-dasharray": [0.01, 5.5] },
      });
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
      lastFitKeyRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const updateThemeLayers = () => {
      applyMapPalette(map, theme);
      const ringColor = getRingColor(theme);
      if (map.getLayer("radius-fill")) {
        map.setPaintProperty("radius-fill", "fill-color", ringColor);
      }

      if (map.getLayer("radius-line")) {
        map.setPaintProperty("radius-line", "line-color", ringColor);
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
    if (!map) {
      return;
    }

    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;

      return;
    }

    if (!userMarkerRef.current) {
      const element = document.createElement("div");
      element.className = "user-dot";
      element.setAttribute("aria-label", "Lokasi Anda saat ini");
      userMarkerRef.current = new Marker({ element })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userLocation.longitude, userLocation.latitude]);
    }
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || lastFitKeyRef.current === fitRequest.key) {
      return;
    }

    if (fitRequest.skipIfMoving && map.isMoving()) {
      return;
    }

    lastFitKeyRef.current = fitRequest.key;
    const padding = { top: 0, right: 0, bottom: 0, left: 0, ...fitRequest.padding };
    const duration = fitRequest.instant ? 0 : 700;
    if (fitRequest.bounds) {
      const [west, south, east, north] = fitRequest.bounds;
      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        {
          padding: {
            top: padding.top + FIT_BOUNDS_PADDING,
            right: padding.right + FIT_BOUNDS_PADDING,
            bottom: padding.bottom + FIT_BOUNDS_PADDING,
            left: padding.left + FIT_BOUNDS_PADDING,
          },
          duration,
          maxZoom: 17,
        },
      );
    } else if (fitRequest.zoom !== undefined) {
      map.easeTo({
        center: [fitRequest.center.longitude, fitRequest.center.latitude],
        zoom: fitRequest.zoom,
        padding,
        duration,
      });
    } else if (fitRequest.radiusKm === null) {
      map.easeTo({
        center: [fitRequest.center.longitude, fitRequest.center.latitude],
        zoom:
          fitRequest.minZoom === undefined
            ? undefined
            : Math.max(map.getZoom(), fitRequest.minZoom),
        padding,
        duration,
      });
    } else {
      map.fitBounds(radiusBounds(fitRequest.center, fitRequest.radiusKm * FIT_MARGIN), {
        padding,
        duration,
        maxZoom: 18,
      });
    }
  }, [fitRequest]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const markerItems = markerItemsRef.current;
    const activeIds = new Set(markerItems.map((item) => item.id));
    markersRef.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    for (const item of markerItems) {
      // Rebuilt on every change so name, category and status always match the data.
      markersRef.current.get(item.id)?.remove();
      const element = createMarkerElement(item);
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(item.id);
      });
      const marker = new Marker({ element, anchor: "center" })
        .setLngLat([item.longitude, item.latitude])
        .addTo(map);
      setMarkerSelected(marker, item.id === selectedIdRef.current);
      markersRef.current.set(item.id, marker);
    }
  }, [markerItemsKey]);

  useEffect(() => {
    markersRef.current.forEach((marker, id) => setMarkerSelected(marker, id === selectedId));
  }, [selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const updateRadius = () =>
      (map.getSource("radius") as GeoJSONSource | undefined)?.setData(circleData);
    if (map.isStyleLoaded()) {
      updateRadius();
    } else {
      map.once("load", updateRadius);
    }

    return () => {
      map.off("load", updateRadius);
    };
  }, [circleData]);

  return <div ref={containerRef} className="map-canvas" aria-label="Peta lokasi UMKM" />;
}

export const MapLibreUmkmMap = UmkmMapWithMarkers;
