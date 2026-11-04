import type { Map as MapLibreMap } from "maplibre-gl";

import type { Theme } from "@/lib/theme/use-theme";

// Free vector basemap (OpenStreetMap data); every colour is replaced below to follow the design tokens.
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

interface MapPalette {
  land: string;
  park: string;
  water: string;
  road: string;
  roadCasing: string;
  mainRoad: string;
  mainRoadCasing: string;
  text: string;
  ring: string;
}

// Same values as --ml, --mp, --mw, --mr, --mrc, --mmain, --mmc, --mt, --ring in globals.css.
const PALETTES: Record<Theme, MapPalette> = {
  light: {
    land: "#e9edf2",
    park: "#dbe9d6",
    water: "#cfe2f1",
    road: "#ffffff",
    roadCasing: "#d6dde7",
    mainRoad: "#ffffff",
    mainRoadCasing: "#c9d3e0",
    text: "#7a8aa0",
    ring: "#65a30d",
  },
  dark: {
    land: "#0d131b",
    park: "#10201a",
    water: "#0a1824",
    road: "#1b2634",
    roadCasing: "#0d131b",
    mainRoad: "#2a3b52",
    mainRoadCasing: "#0d131b",
    text: "#5d6f87",
    ring: "#a3d92b",
  },
};

/** Read the search-radius highlight color from the selected map theme. */
export function getRingColor(theme: Theme) {
  return PALETTES[theme].ring;
}

type PaintProperty = Parameters<MapLibreMap["setPaintProperty"]>[1];

function paint(map: MapLibreMap, layerId: string, property: PaintProperty, value: string | number) {
  if (map.getLayer(layerId)) {
    map.setPaintProperty(layerId, property, value);
  }
}

/** Recolour the loaded basemap so it matches the illustrated map of the design. */
export function applyMapPalette(map: MapLibreMap, theme: Theme) {
  const palette = PALETTES[theme];

  paint(map, "background", "background-color", palette.land);
  paint(map, "park", "fill-color", palette.park);
  paint(map, "landcover_wood", "fill-color", palette.park);
  paint(map, "landuse_residential", "fill-color", palette.land);
  paint(map, "water", "fill-color", palette.water);
  paint(map, "waterway", "line-color", palette.water);
  paint(map, "building", "fill-color", palette.land);
  paint(map, "building", "fill-outline-color", palette.roadCasing);

  for (const id of [
    "highway_path",
    "highway_minor",
    "highway_major_inner",
    "highway_major_subtle",
  ]) {
    paint(map, id, "line-color", palette.road);
  }

  paint(map, "highway_major_casing", "line-color", palette.roadCasing);

  for (const id of [
    "highway_motorway_inner",
    "highway_motorway_bridge_inner",
    "tunnel_motorway_inner",
    "highway_motorway_subtle",
  ]) {
    paint(map, id, "line-color", palette.mainRoad);
  }

  for (const id of [
    "highway_motorway_casing",
    "highway_motorway_bridge_casing",
    "tunnel_motorway_casing",
  ]) {
    paint(map, id, "line-color", palette.mainRoadCasing);
  }

  for (const id of [
    "railway",
    "railway_service",
    "railway_transit",
    "boundary_2",
    "boundary_3",
    "boundary_disputed",
  ]) {
    paint(map, id, "line-color", palette.roadCasing);
  }

  for (const layer of map.getStyle().layers) {
    if (layer.type !== "symbol") {
      continue;
    }

    paint(map, layer.id, "text-color", palette.text);
    paint(map, layer.id, "text-halo-color", palette.land);
  }
}
