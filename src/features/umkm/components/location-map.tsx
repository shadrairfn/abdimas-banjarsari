"use client";

import dynamic from "next/dynamic";
import { GoogleLocationMap } from "@/features/map/components/google-location-map";
import { useMapProvider } from "@/features/map/google-maps-loader";
import type { MapPinItem } from "@/features/map/google-map-markers";

const MapLibreLocationMap = dynamic(() => import("./maplibre-location-map").then((module) => module.MapLibreLocationMap), {
  ssr: false, loading: () => <div className="loc-map" aria-busy="true" />,
});

export function LocationMap({ item }: { item: MapPinItem }) {
  const provider = useMapProvider();
  return provider === "google" ? <GoogleLocationMap item={item} /> : <MapLibreLocationMap item={item} />;
}
