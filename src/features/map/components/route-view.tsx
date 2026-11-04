"use client";

import { ArrowLeft, LocateFixed, MapPin, Navigation } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Rail } from "@/components/rail";
import { useMapProvider } from "@/features/map/google-maps-loader";
import { useGoogleMap } from "@/features/map/use-google-map";
import { LocationMap } from "@/features/umkm/components/location-map";
import { directionsUrl, displayText, formatDistance } from "@/features/umkm/format";
import type { Umkm } from "@/features/umkm/types";
import { useTheme } from "@/lib/theme/use-theme";

type Point = { lat: number; lng: number };
type Mode = "DRIVING" | "WALKING";

function RouteMap({
  item,
  origin,
  picking,
  onOrigin,
  route,
}: {
  item: Umkm;
  origin: Point | null;
  picking: boolean;
  onOrigin: (point: Point) => void;
  route: google.maps.routes.Route | null;
}) {
  const { theme } = useTheme();
  const { containerRef, map } = useGoogleMap(theme, () => ({
    center: { lat: item.latitude, lng: item.longitude },
    zoom: 15,
    zoomControl: true,
    gestureHandling: "greedy",
  }));
  useEffect(() => {
    if (!map) {
      return;
    }

    map.setOptions({ draggableCursor: picking ? "crosshair" : null });
    if (!picking) {
      return;
    }

    const listener = map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        onOrigin(event.latLng.toJSON());
      }
    });

    return () => listener.remove();
  }, [map, picking, onOrigin]);
  useEffect(() => {
    if (!map) {
      return;
    }

    const pins = [
      {
        position: { lat: item.latitude, lng: item.longitude },
        title: displayText(item.brand),
        glyph: "B",
      },
      ...(origin ? [{ position: origin, title: "Titik berangkat", glyph: "A" }] : []),
    ];
    const markers = pins.map((pin) => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: pin.position,
        title: pin.title,
      });
      marker.append(
        new google.maps.marker.PinElement({
          glyphText: pin.glyph,
          background: pin.glyph === "A" ? "#4285f4" : "#c9f52f",
          glyphColor: "#111827",
          borderColor: "#111827",
        }),
      );

      return marker;
    });

    return () =>
      markers.forEach((marker) => {
        marker.map = null;
      });
  }, [map, origin, item]);
  useEffect(() => {
    if (!map || !route?.path?.length) {
      return;
    }

    const path = route.path.map((point) => ({ lat: point.lat, lng: point.lng }));
    const line = new google.maps.Polyline({
      map,
      path,
      strokeColor: "#4285f4",
      strokeWeight: 6,
      strokeOpacity: 0.95,
    });
    const bounds = new google.maps.LatLngBounds();
    path.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, 48);

    return () => line.setMap(null);
  }, [map, route]);

  return (
    <div className="route-map" data-map-provider="google">
      <div ref={containerRef} className="google-map-host" aria-label="Peta rute menuju usaha" />
    </div>
  );
}

export function RouteView({ item }: { item: Umkm }) {
  const provider = useMapProvider();
  const [origin, setOrigin] = useState<Point | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [mode, setMode] = useState<Mode>("DRIVING");
  const [route, setRoute] = useState<google.maps.routes.Route | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );

  function chooseOrigin(point: Point) {
    setOrigin(point);
    setIsPicking(false);
    setRoute(null);
    setError("");
  }

  function locate() {
    if (!navigator.geolocation) {
      setError("Browser tidak mendukung lokasi. Pilih titik berangkat pada peta.");

      return;
    }

    setIsLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        chooseOrigin({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setError("Lokasi tidak dapat diakses. Izinkan akses lokasi atau pilih titik pada peta.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function calculate() {
    if (!origin || isPending || provider !== "google") {
      return;
    }

    const request = ++generation.current;
    setIsPending(true);
    setError("");
    setRoute(null);
    setIsPicking(false);

    try {
      const { Route } = (await google.maps.importLibrary("routes")) as google.maps.RoutesLibrary;
      const result = await Route.computeRoutes({
        origin,
        destination: { lat: item.latitude, lng: item.longitude },
        travelMode: mode,
        ...(mode === "DRIVING" ? { routingPreference: "TRAFFIC_UNAWARE" as const } : {}),
        fields: ["path", "distanceMeters", "durationMillis", "legs"],
        language: "id",
        region: "id",
      });
      if (request !== generation.current) {
        return;
      }

      if (!result.routes?.length) {
        throw new Error("empty");
      }

      setRoute(result.routes[0]);
    } catch {
      if (request === generation.current) {
        setError(
          "Rute belum dapat dimuat. Layanan atau kuota rute mungkin tidak tersedia. Anda dapat membuka petunjuk di Google Maps.",
        );
      }
    } finally {
      if (request === generation.current) {
        setIsPending(false);
      }
    }
  }
  const external = `${directionsUrl(item)}${origin ? `&origin=${origin.lat},${origin.lng}` : ""}&travelmode=${mode === "WALKING" ? "walking" : "driving"}`;
  const steps = route?.legs?.flatMap((leg) => leg.steps ?? []) ?? [];

  return (
    <div className="app page-min-h" style={{ position: "relative" }}>
      <Rail
        items={[
          { label: "Peta", icon: "map", href: "/", active: true },
          { label: "Bandingkan", icon: "compare", href: "/bandingkan" },
        ]}
      />
      <main className="app-body route-page">
        <Link className="btn o sm" href={`/umkm/${item.id}`}>
          <ArrowLeft className="i sm" />
          Kembali ke profil
        </Link>
        <h1>Rute ke {displayText(item.brand)}</h1>
        <div className="route-layout">
          <section className="route-panel" aria-label="Pengaturan dan petunjuk rute">
            <div className="route-stop">
              <span className="badge">A</span>
              <div>
                <strong>Titik berangkat</strong>
                <p className="mut">
                  {origin
                    ? `${origin.lat.toFixed(6)}, ${origin.lng.toFixed(6)}`
                    : "Tentukan lokasi Anda terlebih dahulu"}
                </p>
              </div>
            </div>
            <div className="route-actions">
              <button
                className="btn o sm"
                disabled={isPending || isLocating || provider !== "google"}
                onClick={locate}
              >
                <LocateFixed className="i sm" />
                {isLocating ? "Mencari lokasi…" : "Lokasi saya"}
              </button>
              <button
                className="btn o sm"
                disabled={isPending || isLocating || provider !== "google"}
                aria-pressed={isPicking}
                onClick={() => setIsPicking(!isPicking)}
              >
                <MapPin className="i sm" />
                {isPicking ? "Batal memilih" : "Pilih di peta"}
              </button>
            </div>
            {isPicking && (
              <p role="status" className="route-prompt">
                Klik peta untuk menetapkan titik berangkat.
              </p>
            )}
            <div className="route-stop">
              <span className="badge">B</span>
              <div>
                <strong>{displayText(item.brand)}</strong>
                <p className="mut">{item.address || "Desa Banjarsari, Garut"}</p>
              </div>
            </div>
            <label className="route-mode">
              Moda perjalanan
              <select
                className="input"
                value={mode}
                disabled={isPending}
                onChange={(event) => {
                  setMode(event.target.value as Mode);
                  setRoute(null);
                }}
              >
                <option value="DRIVING">Mobil</option>
                <option value="WALKING">Jalan kaki</option>
              </select>
            </label>
            <button
              className="btn"
              disabled={!origin || isPending || isLocating || provider !== "google"}
              onClick={calculate}
            >
              <Navigation className="i" />
              {isPending ? "Memuat rute…" : "Tampilkan rute"}
            </button>
            {provider !== "google" && (
              <p className="route-prompt" role="status">
                Peta cadangan sedang digunakan. Buka Google Maps untuk petunjuk perjalanan.
              </p>
            )}
            {error && (
              <p className="route-prompt" role="alert">
                {error}
              </p>
            )}
            {route && (
              <div className="route-result" role="status">
                <strong>
                  {formatDistance((route.distanceMeters ?? 0) / 1000)} ·{" "}
                  {Math.max(1, Math.ceil((route.durationMillis ?? 0) / 60000))} menit
                </strong>
                <p className="mut">Perkiraan waktu perjalanan</p>
              </div>
            )}
            <a className="btn o sm" href={external} target="_blank" rel="noreferrer">
              Buka di Google Maps ↗
            </a>
            {mode === "WALKING" && route && (
              <p className="mut">
                Rute jalan kaki dapat melewati jalur yang belum lengkap. Perhatikan kondisi jalan
                dan rambu.
              </p>
            )}
            {steps.length > 0 && (
              <ol className="route-steps">
                {steps.map((step, index) => (
                  <li key={index}>
                    <span>
                      {step.instructions?.replace(/<[^>]*>/g, "") || "Lanjutkan perjalanan"}
                    </span>
                    <small className="mut">
                      {formatDistance((step.distanceMeters ?? 0) / 1000)}
                    </small>
                  </li>
                ))}
              </ol>
            )}
          </section>
          {provider === "google" ? (
            <RouteMap
              item={item}
              origin={origin}
              picking={isPicking}
              onOrigin={chooseOrigin}
              route={route}
            />
          ) : (
            <div className="route-map">
              <LocationMap item={item} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
