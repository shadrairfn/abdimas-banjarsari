"use client";

import { useEffect, useRef } from "react";
import { createGooglePin, googlePosition, selectGooglePin, type MapPinItem } from "@/features/map/google-map-markers";
import { useGoogleMap } from "@/features/map/use-google-map";
import { useTheme } from "@/lib/theme/use-theme";

interface GoogleLocationMapProps {
  item: MapPinItem;
  onChange?: (latitude: number, longitude: number) => void;
}

/** One map implementation for the profile, comparison, and editable coordinate picker. */
export function GoogleLocationMap({ item, onChange }: GoogleLocationMapProps) {
  const { theme } = useTheme();
  const onChangeRef = useRef(onChange);
  const editable = Boolean(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const { containerRef, map } = useGoogleMap(theme, () => ({
    center: googlePosition(item), zoom: editable ? 16 : 15,
    gestureHandling: editable ? "greedy" : "none", keyboardShortcuts: editable,
    zoomControl: editable,
  }));
  const { latitude, longitude, subCategory } = item;

  useEffect(() => {
    if (!map) return;
    const point = { latitude, longitude, subCategory };
    const pin = createGooglePin(point);
    selectGooglePin(pin, true);
    const marker = new google.maps.marker.AdvancedMarkerElement({ map, position: googlePosition(point), title: editable ? "Geser titik lokasi usaha" : "Lokasi usaha", gmpDraggable: editable, anchorTop: "-50%" });
    marker.append(pin);
    if (!editable || !map.getBounds()?.contains(googlePosition(point))) map.panTo(googlePosition(point));
    const events: google.maps.MapsEventListener[] = [];
    const dragEnd = () => {
      const position = marker.position;
      if (!position) return;
      const point = position instanceof google.maps.LatLng ? position.toJSON() : position;
      onChangeRef.current?.(point.lat, point.lng);
    };
    if (editable) {
      marker.addEventListener("gmp-dragend", dragEnd);
      events.push(map.addListener("click", (event: google.maps.MapMouseEvent) => {
        if (event.latLng) onChangeRef.current?.(event.latLng.lat(), event.latLng.lng());
      }));
    }
    return () => { events.forEach((event) => event.remove()); marker.removeEventListener("gmp-dragend", dragEnd); marker.map = null; };
  }, [map, latitude, longitude, subCategory, editable]);

  return <div className={`loc-map${editable ? " picker" : ""}`} data-map-provider="google"><div ref={containerRef} className="google-map-host" aria-label={editable ? "Pilih titik lokasi UMKM" : "Peta lokasi usaha"} /></div>;
}
