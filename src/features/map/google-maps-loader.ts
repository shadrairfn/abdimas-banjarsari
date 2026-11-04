"use client";

import { useSyncExternalStore } from "react";

declare global {
  interface Window {
    gm_authFailure?: () => void;
    __umkmGoogleMapsReady?: () => void;
  }
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
export const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
const CONFIGURED = Boolean(API_KEY && GOOGLE_MAP_ID);
const RETRY_STORAGE_KEY = "umkm_google_maps_retry";
const RETRY_DELAY_MS = 5 * 60 * 1000;
const CONFIGURATION = `${GOOGLE_MAP_ID}:${API_KEY?.slice(-6)}`;
const listeners = new Set<() => void>();
let isFailed = false;
let loading: Promise<typeof google.maps> | undefined;
let rejectLoading: ((error: Error) => void) | undefined;

function retryBlocked() {
  if (isFailed) {
    return true;
  }

  try {
    const saved = JSON.parse(sessionStorage.getItem(RETRY_STORAGE_KEY) ?? "null");

    return saved?.configuration === CONFIGURATION && saved.retryAfter > Date.now();
  } catch {
    return false;
  }
}

/** One circuit for every map on the page, including maps created after an SDK failure. */
export function useMapProvider() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    () => (CONFIGURED && !retryBlocked() ? "google" : "maplibre"),
    () => (CONFIGURED ? "google" : "maplibre"),
  );
}

/** Notify map consumers to use the shared fallback after Google becomes unavailable. */
export function failGoogleMaps() {
  if (isFailed) {
    return;
  }

  isFailed = true;

  try {
    sessionStorage.setItem(
      RETRY_STORAGE_KEY,
      JSON.stringify({ configuration: CONFIGURATION, retryAfter: Date.now() + RETRY_DELAY_MS }),
    );
  } catch {
    /* Fallback still works when browser storage is unavailable. */
  }

  rejectLoading?.(new Error("Google Maps is unavailable"));
  listeners.forEach((listener) => listener());
}

/** Load the official SDK once. The browser key is intentionally public and domain-restricted. */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (!CONFIGURED || retryBlocked()) {
    return Promise.reject(new Error("Google Maps is unavailable"));
  }

  if (loading) {
    return loading;
  }

  loading = new Promise((resolve, reject) => {
    rejectLoading = reject;
    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      failGoogleMaps();
      previousAuthFailure?.();
    };
    const timeout = window.setTimeout(() => failGoogleMaps(), 15000);
    window.__umkmGoogleMapsReady = () => {
      window.clearTimeout(timeout);
      if (isFailed) {
        return;
      }

      rejectLoading = undefined;
      resolve(google.maps);
    };
    const params = new URLSearchParams({
      key: API_KEY!,
      callback: "__umkmGoogleMapsReady",
      loading: "async",
      libraries: "marker",
      v: "weekly",
      language: "id",
      region: "ID",
    });
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeout);
      failGoogleMaps();
    };
    script.nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ?? "";
    document.head.append(script);
  });

  return loading;
}

/**
 * Quota/key failures can arrive after the SDK callback, rather than reject the script request.
 * Watch Google's error panel as a secondary signal and require an actual tile render on startup.
 * Never inspect or suppress console output, and never cover Google's attribution.
 */
export function watchGoogleMap(map: google.maps.Map) {
  const container = map.getDiv();
  const timeout = window.setTimeout(failGoogleMaps, 20000);
  const loaded = map.addListener("tilesloaded", () => window.clearTimeout(timeout));
  const observer = new MutationObserver(() => {
    if (container.querySelector(".gm-err-container, .gm-err-message")) {
      failGoogleMaps();
    }
  });
  observer.observe(container, { childList: true, subtree: true });

  return () => {
    window.clearTimeout(timeout);
    loaded.remove();
    observer.disconnect();
  };
}
