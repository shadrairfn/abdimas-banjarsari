"use client";

import dynamic from "next/dynamic";

import { GoogleLocationMap } from "@/features/map/components/google-location-map";
import { useMapProvider } from "@/features/map/google-maps-loader";

import type { CoordinatePickerProps } from "./maplibre-coordinate-picker";

const MapLibreCoordinatePicker = dynamic(
  () => import("./maplibre-coordinate-picker").then((module) => module.MapLibreCoordinatePicker),
  {
    ssr: false,
    loading: () => <div className="loc-map picker" aria-busy="true" />,
  },
);

export function CoordinatePicker(props: CoordinatePickerProps) {
  const provider = useMapProvider();

  return provider === "google" ? (
    <GoogleLocationMap item={props} onChange={props.onChange} />
  ) : (
    <MapLibreCoordinatePicker {...props} />
  );
}
