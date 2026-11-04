"use client";

import dynamic from "next/dynamic";

import type { Umkm } from "@/features/umkm/types";

// The explorer restores the last map view from sessionStorage when it is created,
// so it is rendered in the browser only; the server HTML would not know that view.
const MapExplorer = dynamic(
  () => import("@/features/map/components/map-explorer").then((module) => module.MapExplorer),
  { ssr: false, loading: () => <main className="app page-h" aria-busy="true" /> },
);

interface MapExplorerLoaderProps {
  initialItems: Umkm[];
  initialSelectedId?: string;
}

export function MapExplorerLoader(props: MapExplorerLoaderProps) {
  return <MapExplorer {...props} />;
}
