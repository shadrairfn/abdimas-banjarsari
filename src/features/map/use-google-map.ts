"use client";

import { useEffect, useRef, useState } from "react";
import { failGoogleMaps, GOOGLE_MAP_ID, loadGoogleMaps, watchGoogleMap } from "@/features/map/google-maps-loader";
import type { Theme } from "@/lib/theme/use-theme";

export function useGoogleMap(theme: Theme, options: () => google.maps.MapOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef(options);
  const cameraRef = useRef<{ center?: google.maps.LatLng; zoom?: number } | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  useEffect(() => { optionsRef.current = options; });

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    loadGoogleMaps().then((maps) => {
      if (cancelled || !containerRef.current) return;
      const instance = new maps.Map(containerRef.current, {
        mapId: GOOGLE_MAP_ID,
        colorScheme: theme === "dark" ? maps.ColorScheme.DARK : maps.ColorScheme.LIGHT,
        disableDefaultUI: true,
        clickableIcons: false,
        ...optionsRef.current(),
        ...cameraRef.current,
      });
      const stopWatching = watchGoogleMap(instance);
      setMap(instance);
      cleanup = () => {
        cameraRef.current = { center: instance.getCenter(), zoom: instance.getZoom() };
        stopWatching();
        maps.event.clearInstanceListeners(instance);
        instance.unbindAll();
        instance.getDiv().replaceChildren();
      };
    }).catch(failGoogleMaps);
    return () => { cancelled = true; cleanup?.(); };
  }, [theme]);

  return { containerRef, map };
}
