"use client";

import { useEffect, useMemo, useRef } from "react";

import {
  createGooglePin,
  googlePosition,
  selectGooglePin,
} from "@/features/map/google-map-markers";
import { getRingColor } from "@/features/map/map-style";
import type { UmkmMapProps } from "@/features/map/map-types";
import { useGoogleMap } from "@/features/map/use-google-map";
import { displayText } from "@/features/umkm/format";

function radiusBounds(
  center: UmkmMapProps["center"],
  radiusKm: number,
): google.maps.LatLngBoundsLiteral {
  const lat = radiusKm / 111.32;
  const lng = lat / Math.cos((center.latitude * Math.PI) / 180);

  return {
    west: center.longitude - lng,
    east: center.longitude + lng,
    south: center.latitude - lat,
    north: center.latitude + lat,
  };
}

export function GoogleUmkmMap(props: UmkmMapProps) {
  const { theme = "light", items, selectedId, userLocation, center, radiusKm, fitRequest } = props;
  const propsRef = useRef(props);
  const markersRef = useRef(
    new Map<string, { marker: google.maps.marker.AdvancedMarkerElement; element: HTMLElement }>(),
  );
  const userInitiated = useRef(false);
  const moving = useRef(false);
  const lastFitKey = useRef<number | null>(null);
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
    propsRef.current = props;
  });
  const { containerRef, map } = useGoogleMap(theme, () => ({
    center: googlePosition(propsRef.current.initialCamera ?? propsRef.current.center),
    zoom: propsRef.current.initialCamera?.zoom ?? 14.1,
    minZoom: 8,
    maxZoom: 19,
    gestureHandling: "greedy",
    isFractionalZoomEnabled: true,
  }));

  useEffect(() => {
    if (!map) {
      return;
    }

    const visibleRadius = () =>
      Number(
        (
          Math.abs((map.getBounds()?.getNorthEast().lat() ?? 0) - (map.getCenter()?.lat() ?? 0)) *
          111.32
        ).toFixed(1),
      );
    const report = () => {
      const point = map.getCenter();
      const bounds = map.getBounds();
      if (!point || !bounds) {
        return;
      }

      propsRef.current.onViewportChange(
        {
          center: { latitude: point.lat(), longitude: point.lng() },
          zoom: map.getZoom() ?? 14,
          bounds: {
            north: bounds.getNorthEast().lat(),
            east: bounds.getNorthEast().lng(),
            south: bounds.getSouthWest().lat(),
            west: bounds.getSouthWest().lng(),
          },
        },
        userInitiated.current,
      );
      propsRef.current.onZoomRadiusChange?.(visibleRadius());
    };
    const zoomBy = (delta: number) => {
      userInitiated.current = true;
      map.setZoom((map.getZoom() ?? 14) + delta);
      propsRef.current.onUserZoom?.(visibleRadius());
    };
    propsRef.current.onReady?.({ zoomIn: () => zoomBy(1), zoomOut: () => zoomBy(-1) });
    const input = () => {
      userInitiated.current = true;
    };
    const container = map.getDiv();
    container.addEventListener("pointerdown", input, true);
    container.addEventListener("wheel", input, { capture: true, passive: true });
    container.addEventListener("keydown", input, true);
    let throttle: ReturnType<typeof setTimeout> | undefined;
    const events = [
      map.addListener("dragstart", input),
      map.addListener("bounds_changed", () => {
        if (!moving.current) {
          moving.current = true;
          propsRef.current.onMovingChange(true);
        }

        if (userInitiated.current && !throttle) {
          throttle = setTimeout(() => {
            throttle = undefined;
            report();
          }, 80);
        }
      }),
      map.addListener("zoom_changed", () => {
        if (userInitiated.current) {
          propsRef.current.onUserZoom?.(visibleRadius());
        }
      }),
      map.addListener("idle", () => {
        if (throttle) {
          clearTimeout(throttle);
          throttle = undefined;
        }

        report();
        userInitiated.current = false;
        moving.current = false;
        propsRef.current.onMovingChange(false);
      }),
    ];

    return () => {
      events.forEach((event) => event.remove());
      if (throttle) {
        clearTimeout(throttle);
      }

      container.removeEventListener("pointerdown", input, true);
      container.removeEventListener("wheel", input, true);
      container.removeEventListener("keydown", input, true);
    };
  }, [map]);

  useEffect(() => {
    if (!map || lastFitKey.current === fitRequest.key) {
      return;
    }

    if (fitRequest.skipIfMoving && moving.current) {
      return;
    }

    lastFitKey.current = fitRequest.key;
    userInitiated.current = false;
    const padding = { top: 0, right: 0, bottom: 0, left: 0, ...fitRequest.padding };
    let limit: google.maps.MapsEventListener | undefined;
    if (fitRequest.bounds || (fitRequest.radiusKm !== null && fitRequest.zoom === undefined)) {
      const bounds = fitRequest.bounds
        ? {
            west: fitRequest.bounds[0],
            south: fitRequest.bounds[1],
            east: fitRequest.bounds[2],
            north: fitRequest.bounds[3],
          }
        : radiusBounds(fitRequest.center, fitRequest.radiusKm! * 1.35);
      const extra = fitRequest.bounds ? 48 : 0;
      limit = google.maps.event.addListenerOnce(map, "idle", () => {
        const maxZoom = fitRequest.bounds ? 17 : 18;
        if ((map.getZoom() ?? 0) > maxZoom) {
          map.setZoom(maxZoom);
        }
      });
      map.fitBounds(bounds, {
        top: padding.top + extra,
        right: padding.right + extra,
        bottom: padding.bottom + extra,
        left: padding.left + extra,
      });
    } else {
      const zoom = fitRequest.zoom ?? Math.max(map.getZoom() ?? 14, fitRequest.minZoom ?? 0);
      let target: google.maps.LatLng | google.maps.LatLngLiteral = googlePosition(
        fitRequest.center,
      );
      const projection = map.getProjection();
      const point = projection?.fromLatLngToPoint(new google.maps.LatLng(target));
      if (point && projection) {
        const scale = 2 ** zoom;
        target =
          projection.fromPointToLatLng(
            new google.maps.Point(
              point.x + (padding.right - padding.left) / 2 / scale,
              point.y + (padding.bottom - padding.top) / 2 / scale,
            ),
          ) ?? target;
      }

      if (fitRequest.instant) {
        map.moveCamera({ center: target, zoom });
      } else {
        map.setZoom(zoom);
        map.panTo(target);
      }
    }

    return () => limit?.remove();
  }, [map, fitRequest]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const markers = markersRef.current;
    const events: (() => void)[] = [];
    for (const item of propsRef.current.items) {
      const element = createGooglePin(item, item.brand);
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: googlePosition(item),
        title: `Pilih ${displayText(item.brand)}, kategori ${item.subCategory}`,
        anchorTop: "-50%",
        gmpClickable: true,
      });
      marker.append(element);
      const select = () => propsRef.current.onSelect(item.id);
      marker.addEventListener("gmp-click", select);
      events.push(() => marker.removeEventListener("gmp-click", select));
      const isSelected = propsRef.current.selectedId === item.id;
      selectGooglePin(element, isSelected);
      marker.zIndex = isSelected ? 6 : 2;
      markers.set(item.id, { marker, element });
    }

    return () => {
      events.forEach((remove) => remove());
      markers.forEach(({ marker }) => {
        marker.map = null;
      });
      markers.clear();
    };
  }, [map, markerItemsKey]);

  useEffect(() => {
    markersRef.current.forEach(({ marker, element }, id) => {
      const isSelected = id === selectedId;
      selectGooglePin(element, isSelected);
      marker.zIndex = isSelected ? 6 : 2;
    });
  }, [selectedId]);

  useEffect(() => {
    if (!map || !userLocation) {
      return;
    }

    const dot = document.createElement("div");
    dot.className = "user-dot google-user-dot";
    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: googlePosition(userLocation),
      title: "Lokasi Anda saat ini",
      anchorTop: "-50%",
      zIndex: 10,
    });
    marker.append(dot);

    return () => {
      marker.map = null;
    };
  }, [map, userLocation]);

  useEffect(() => {
    if (!map || radiusKm === null) {
      return;
    }

    const path = Array.from({ length: 73 }, (_, i) => {
      const angle = (i / 72) * Math.PI * 2;

      return {
        lat: center.latitude + (radiusKm / 111.32) * Math.sin(angle),
        lng:
          center.longitude +
          (radiusKm / (111.32 * Math.cos((center.latitude * Math.PI) / 180))) * Math.cos(angle),
      };
    });
    const color = getRingColor(theme);
    const fill = new google.maps.Polygon({
      map,
      paths: path,
      fillColor: color,
      fillOpacity: 0.05,
      strokeOpacity: 0,
      clickable: false,
    });
    const line = new google.maps.Polyline({
      map,
      path,
      strokeOpacity: 0,
      clickable: false,
      icons: [
        {
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 1,
            strokeOpacity: 0,
            scale: 1,
          },
          offset: "0",
          repeat: "9px",
        },
      ],
    });

    return () => {
      fill.setMap(null);
      line.setMap(null);
    };
  }, [map, center, radiusKm, theme]);

  return (
    <div className="map-canvas google-map-overview" data-map-provider="google">
      <div ref={containerRef} className="google-map-host" aria-label="Peta lokasi UMKM" />
    </div>
  );
}
