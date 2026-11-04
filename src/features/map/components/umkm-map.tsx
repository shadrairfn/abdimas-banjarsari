"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { GoogleUmkmMap } from "@/features/map/components/google-umkm-map";
import { useMapProvider } from "@/features/map/google-maps-loader";
import type { UmkmMapProps } from "@/features/map/map-types";

export type { MapControls } from "@/features/map/map-types";

const MapLibreUmkmMap = dynamic(
  () => import("./maplibre-umkm-map").then((module) => module.MapLibreUmkmMap),
  {
    ssr: false,
    loading: () => <div className="map-canvas" aria-busy="true" />,
  },
);

function FallbackMap({
  camera,
  ...props
}: UmkmMapProps & { camera: UmkmMapProps["initialCamera"] }) {
  const [initial] = useState(() => ({
    camera,
    request: camera
      ? {
          key: props.fitRequest.key,
          center: camera,
          zoom: camera.zoom,
          radiusKm: null,
          instant: true,
        }
      : props.fitRequest,
  }));
  // Keep restoration stable while viewport reports trigger parent renders during a drag.
  const request = props.fitRequest.key === initial.request.key ? initial.request : props.fitRequest;

  return (
    <div className="map-canvas" data-map-provider="maplibre">
      <MapLibreUmkmMap {...props} initialCamera={initial.camera} fitRequest={request} />
    </div>
  );
}

/** Prefer Google, but keep the existing renderer and the last camera when Google is unavailable. */
export function UmkmMap(props: UmkmMapProps) {
  const provider = useMapProvider();
  const [camera, setCamera] = useState(props.initialCamera);
  if (provider === "maplibre") {
    return <FallbackMap {...props} camera={camera} />;
  }

  return (
    <GoogleUmkmMap
      {...props}
      onViewportChange={(viewport, isUserInitiated) => {
        setCamera({ ...viewport.center, zoom: viewport.zoom });
        props.onViewportChange(viewport, isUserInitiated);
      }}
    />
  );
}
