"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Map as MapLibreMap, Marker } from "maplibre-gl";
import { LocateFixed } from "lucide-react";

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
  const [isLive, setIsLive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const stopLiveTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLive(false);
  }, []);

  const startLiveTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg("Perangkat ini tidak mendukung GPS.");
      return;
    }
    stopLiveTracking();
    setErrorMsg(null);

    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const lat = Number(coords.latitude.toFixed(6));
        const lng = Number(coords.longitude.toFixed(6));
        onChangeRef.current(lat, lng);
        markerRef.current?.setLngLat([lng, lat]);
        mapRef.current?.easeTo({ center: [lng, lat], zoom: 17, duration: 600 });
        setIsLive(true);
      },
      (err) => {
        setErrorMsg(`Gagal GPS: ${err.message}`);
        setIsLive(false);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
    );
    watchIdRef.current = id;
    setIsLive(true);
  }, [stopLiveTracking]);

  const toggleLiveTracking = useCallback(() => {
    if (isLive) {
      stopLiveTracking();
    } else {
      startLiveTracking();
    }
  }, [isLive, startLiveTracking, stopLiveTracking]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [initialCoordinates.current.longitude, initialCoordinates.current.latitude],
      zoom: 16,
    });

    const marker = new Marker({ color: "#0f766e", draggable: true })
      .setLngLat([initialCoordinates.current.longitude, initialCoordinates.current.latitude])
      .addTo(map);

    marker.on("dragend", () => {
      stopLiveTracking();
      const point = marker.getLngLat();
      onChangeRef.current(point.lat, point.lng);
    });

    map.on("click", (event) => {
      stopLiveTracking();
      marker.setLngLat(event.lngLat);
      onChangeRef.current(event.lngLat.lat, event.lngLat.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [stopLiveTracking]);

  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude]);
  }, [latitude, longitude]);

  return (
    <div className="coordinate-picker-wrapper">
      <div className="coordinate-picker-header">
        <button
          type="button"
          className={`secondary-button picker-live-btn ${isLive ? "active" : ""}`}
          onClick={toggleLiveTracking}
          title="Lacak posisi GPS secara realtime"
        >
          <LocateFixed size={15} className={isLive ? "live-pulse-icon" : ""} />
          <span>{isLive ? "Lacak GPS Realtime Aktif" : "Lacak GPS Realtime"}</span>
        </button>
        {errorMsg && <span className="picker-error-msg">{errorMsg}</span>}
      </div>
      <div ref={containerRef} className="coordinate-map" aria-label="Pilih titik lokasi UMKM" />
    </div>
  );
}
