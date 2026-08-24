"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  LocateFixed,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  X,
} from "lucide-react";
import { CategoryIcon, CATEGORY_CONFIG } from "@/features/umkm/categories";
import { BANJARSARI_CENTER, type Umkm } from "@/features/umkm/types";

interface MapExplorerProps {
  initialItems: Umkm[];
  initialSelectedId?: string;
}

const subCategories = ["Semua", "Camilan", "Makanan", "Minuman", "Kue & Roti"] as const;
const radii = [1, 5, 10, 20] as const;
const UmkmMap = dynamic(() => import("@/features/map/components/umkm-map").then((module) => module.UmkmMap), { ssr: false, loading: () => <div className="map-loading">Memuat peta…</div> });

function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const earthRadius = 6371;
  const latitudeDelta = ((to.latitude - from.latitude) * Math.PI) / 180;
  const longitudeDelta = ((to.longitude - from.longitude) * Math.PI) / 180;
  const fromLatitude = (from.latitude * Math.PI) / 180;
  const toLatitude = (to.latitude * Math.PI) / 180;
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface MapViewRequest {
  key: number;
  center: typeof BANJARSARI_CENTER;
  radiusKm: number | null;
  zoom?: number;
}

function isInsideViewport(item: Umkm, bounds: ViewportBounds | null) {
  if (!bounds) return true;
  const insideLatitude = item.latitude >= bounds.south && item.latitude <= bounds.north;
  const insideLongitude = bounds.west <= bounds.east
    ? item.longitude >= bounds.west && item.longitude <= bounds.east
    : item.longitude >= bounds.west || item.longitude <= bounds.east;
  return insideLatitude && insideLongitude;
}

function LocationBadge({ status }: { status: Umkm["locationStatus"] }) {
  if (status === "verified") {
    return <span className="status-badge verified"><CheckCircle2 size={13} /> Terverifikasi</span>;
  }
  if (status === "outside") {
    return <span className="status-badge outside"><CircleAlert size={13} /> Di luar desa</span>;
  }
  return <span className="status-badge estimated"><CircleAlert size={13} /> Titik perkiraan</span>;
}

export function MapExplorer({ initialItems, initialSelectedId }: MapExplorerProps) {
  const workspaceRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [subCategory, setSubCategory] = useState<(typeof subCategories)[number]>("Semua");
  const [radiusKm, setRadiusKm] = useState<number | null>(10);
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);
  const [center, setCenter] = useState(BANJARSARI_CENTER);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [centerLabel, setCenterLabel] = useState("Pusat Desa Banjarsari");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [fitRequest, setFitRequest] = useState<MapViewRequest>({ key: 0, center: BANJARSARI_CENTER, radiusKm: 10 });
  const [mapMoving, setMapMoving] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(390);
  const [isResizing, setIsResizing] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const stopResize = useCallback(() => setIsResizing(false), []);

  const stopLiveTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLiveTracking(false);
  }, []);

  const startLiveTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationMessage("Perangkat ini tidak mendukung akses lokasi GPS.");
      return;
    }
    stopLiveTracking();
    setLocationMessage("Mencari sinyal GPS realtime…");

    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const userCoords = { latitude: coords.latitude, longitude: coords.longitude };
        setUserLocation(userCoords);
        setCenter(userCoords);
        setCenterLabel("Lokasi Saya (Real-time)");
        setFitRequest((current) => ({
          key: current.key + 1,
          center: userCoords,
          radiusKm,
          zoom: 16,
        }));
        setLocationMessage(null);
        setIsLiveTracking(true);
      },
      (error) => {
        let msg = "Gagal mengakses lokasi.";
        if (error.code === error.PERMISSION_DENIED) msg = "Izin akses lokasi ditolak oleh peramban.";
        else if (error.code === error.POSITION_UNAVAILABLE) msg = "Sinyal GPS / lokasi tidak tersedia.";
        else if (error.code === error.TIMEOUT) msg = "Waktu pencarian lokasi habis.";
        setLocationMessage(msg);
        setIsLiveTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 12000,
      },
    );
    watchIdRef.current = id;
    setIsLiveTracking(true);
  }, [radiusKm, stopLiveTracking]);

  const toggleLiveTracking = useCallback(() => {
    if (isLiveTracking) {
      stopLiveTracking();
      setLocationMessage("Pelacakan lokasi dinonaktifkan.");
      setTimeout(() => setLocationMessage(null), 3000);
    } else {
      startLiveTracking();
    }
  }, [isLiveTracking, startLiveTracking, stopLiveTracking]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    function resizeSidebar(event: PointerEvent) {
      const bounds = workspaceRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const maximum = Math.min(620, bounds.width * 0.55);
      setSidebarWidth(Math.round(Math.min(maximum, Math.max(280, event.clientX - bounds.left))));
    }
    window.addEventListener("pointermove", resizeSidebar);
    window.addEventListener("pointerup", stopResize);
    document.body.classList.add("sidebar-is-resizing");
    return () => {
      window.removeEventListener("pointermove", resizeSidebar);
      window.removeEventListener("pointerup", stopResize);
      document.body.classList.remove("sidebar-is-resizing");
    };
  }, [isResizing, stopResize]);

  useEffect(() => {
    const normalized = query.trim().toLocaleLowerCase("id-ID");
    if (!normalized) return;

    const timeout = window.setTimeout(() => {
      const matches = initialItems
        .filter((item) => {
          const matchesCategory = subCategory === "Semua" || item.subCategory === subCategory;
          const searchable = `${item.brand} ${item.ownerName} ${item.products} ${item.address}`
            .toLocaleLowerCase("id-ID");
          return matchesCategory && searchable.includes(normalized);
        })
        .sort((first, second) => {
          const score = (brand: string) => brand === normalized ? 0 : brand.startsWith(normalized) ? 1 : brand.includes(normalized) ? 2 : 3;
          const firstBrand = first.brand.toLocaleLowerCase("id-ID");
          const secondBrand = second.brand.toLocaleLowerCase("id-ID");
          return score(firstBrand) - score(secondBrand) || first.brand.localeCompare(second.brand, "id-ID");
        });
      const target = matches[0];
      if (!target) return;

      const targetCenter = { latitude: target.latitude, longitude: target.longitude };
      setCenter(targetCenter);
      setCenterLabel("Hasil pencarian");
      setSelectedId(target.id);
      setFitRequest((current) => ({
        key: current.key + 1,
        center: targetCenter,
        radiusKm: null,
        zoom: 16,
      }));
      setMobileListOpen(false);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [initialItems, query, subCategory]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
    return initialItems
      .map((item) => ({ item, distance: distanceKm(center, item) }))
      .filter(({ item, distance }) => {
        const matchesQuery =
          !normalizedQuery ||
          `${item.brand} ${item.ownerName} ${item.products} ${item.address}`
            .toLocaleLowerCase("id-ID")
            .includes(normalizedQuery);
        const matchesCategory = subCategory === "Semua" || item.subCategory === subCategory;
        const matchesArea = radiusKm === null ? isInsideViewport(item, viewportBounds) : distance <= radiusKm;
        return matchesQuery && matchesCategory && matchesArea;
      })
      .sort((first, second) => first.distance - second.distance);
  }, [center, initialItems, query, radiusKm, subCategory, viewportBounds]);

  const selected = initialItems.find((item) => item.id === selectedId) ?? null;

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Perangkat ini tidak mendukung akses lokasi.");
      return;
    }
    setLocationMessage("Mencari lokasi Anda…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCenter({ latitude: coords.latitude, longitude: coords.longitude });
        setCenterLabel("Lokasi saya");
        setFitRequest((current) => ({ key: current.key + 1, center: { latitude: coords.latitude, longitude: coords.longitude }, radiusKm }));
        setLocationMessage(null);
      },
      () => setLocationMessage("Lokasi tidak dapat diakses. Gunakan pusat desa."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function resetCenter() {
    stopLiveTracking();
    setUserLocation(null);
    setCenter(BANJARSARI_CENTER);
    setCenterLabel("Pusat Desa Banjarsari");
    setFitRequest((current) => ({ key: current.key + 1, center: BANJARSARI_CENTER, radiusKm }));
    setLocationMessage(null);
  }

  const handleViewportChange = useCallback((viewport: { center: typeof BANJARSARI_CENTER; bounds: ViewportBounds }, userInitiated: boolean) => {
    setViewportBounds(viewport.bounds);
    setCenter((current) => {
      if (Math.abs(current.latitude - viewport.center.latitude) < 0.000001 && Math.abs(current.longitude - viewport.center.longitude) < 0.000001) return current;
      return viewport.center;
    });
    if (userInitiated) {
      if (isLiveTracking) {
        stopLiveTracking();
      }
      setCenterLabel("Pusat area peta");
    }
  }, [isLiveTracking, stopLiveTracking]);

  function selectRadius(radius: number) {
    if (radiusKm === radius) {
      setRadiusKm(null);
      return;
    }
    setRadiusKm(radius);
    setFitRequest((current) => ({ key: current.key + 1, center, radiusKm: radius }));
  }

  return (
    <main className="explorer-shell">
      <header className="topbar">
        <Link className="brand-lockup" href="/" aria-label="Peta UMKM Banjarsari">
          <span className="brand-mark"><Store size={22} strokeWidth={2.4} /></span>
          <span>
            <strong>Peta UMKM</strong>
            <small>Banjarsari · Bayongbong</small>
          </span>
        </Link>

        <div className="global-search">
          <Search size={19} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari cireng, rengginang, nama usaha…"
            aria-label="Cari UMKM atau produk"
          />
          {query && (
            <button className="icon-button" onClick={() => setQuery("")} aria-label="Hapus pencarian">
              <X size={17} />
            </button>
          )}
        </div>

        <nav className="top-actions" aria-label="Navigasi utama">
          <Link href="/admin" className="admin-link"><ShieldCheck size={17} /> Dashboard admin</Link>
          <button className="mobile-menu" onClick={() => setMobileListOpen(true)} aria-label="Buka daftar UMKM">
            <Menu size={21} />
          </button>
        </nav>
      </header>

      <section ref={workspaceRef} className="workspace" style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
        <aside className={`result-sidebar ${mobileListOpen ? "mobile-open" : ""}`}>
          <div className="sidebar-heading">
            <div>
              <span className="eyebrow">Jelajahi usaha lokal</span>
              <h1>Temukan UMKM di sekitar Anda</h1>
            </div>
            <button className="mobile-close" onClick={() => setMobileListOpen(false)} aria-label="Tutup daftar">
              <X size={20} />
            </button>
          </div>

          <div className="mobile-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk…" />
          </div>

          <div className="filter-block">
            <div className="filter-label"><SlidersHorizontal size={15} /> Jenis produk</div>
            <div className="chip-row">
              {subCategories.map((category) => (
                <button
                  key={category}
                  className={`filter-chip ${subCategory === category ? "active" : ""}`}
                  onClick={() => setSubCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="radius-card">
            <div className="radius-title">
              <span><MapPin size={16} /> Radius pencarian <small>opsional</small></span>
              <button onClick={resetCenter}>{centerLabel}</button>
            </div>
            <div className="radius-options" aria-label="Pilih radius">
              {radii.map((radius) => (
                <button key={radius} className={radiusKm === radius ? "active" : ""} aria-pressed={radiusKm === radius} onClick={() => selectRadius(radius)}>
                  {radius} km
                </button>
              ))}
            </div>
            <p className="radius-hint">{radiusKm === null ? "Menampilkan UMKM yang terlihat di peta." : "Klik radius aktif untuk menonaktifkannya."}</p>
          </div>

          <div className={`result-summary ${mapMoving ? "updating" : ""}`} aria-live="polite">
            <span>{mapMoving ? "Memperbarui area…" : <><strong>{filteredItems.length}</strong> UMKM ditemukan</>}</span>
            <span>{radiusKm === null ? "di area peta" : `dalam ${radiusKm} km`}</span>
          </div>

          <div className="result-list">
            {filteredItems.length ? filteredItems.map(({ item, distance }) => (
              <button
                key={item.id}
                className={`result-card ${selectedId === item.id ? "selected" : ""}`}
                onClick={() => { setSelectedId(item.id); setMobileListOpen(false); }}
              >
                <span className="category-icon" style={{ color: CATEGORY_CONFIG[item.subCategory].color, background: CATEGORY_CONFIG[item.subCategory].background }}>
                  <CategoryIcon category={item.subCategory} />
                </span>
                <span className="result-copy">
                  <span className="result-topline"><strong>{item.brand}</strong><small>{distance.toFixed(1)} km</small></span>
                  <span className="product-line">{item.products}</span>
                  <span className="result-meta"><span>{item.subCategory}</span> · {item.address.split(",")[0]}</span>
                </span>
              </button>
            )) : (
              <div className="empty-results">
                <Search size={24} />
                <strong>Belum ada hasil</strong>
                <p>Coba kata kunci lain atau perbesar radius pencarian.</p>
              </div>
            )}
          </div>
          <button
            type="button"
            className="sidebar-resizer"
            aria-label="Ubah lebar panel daftar UMKM"
            title="Tarik untuk mengubah lebar sidebar"
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              setIsResizing(true);
            }}
          ><span /></button>
        </aside>

        <div className="map-stage">
          <UmkmMap
            items={filteredItems.map(({ item }) => item)}
            selectedId={selectedId}
            center={center}
            userLocation={userLocation}
            radiusKm={radiusKm}
            fitRequest={fitRequest}
            onSelect={setSelectedId}
            onViewportChange={handleViewportChange}
            onMovingChange={setMapMoving}
          />

          <div className="map-center-indicator" aria-hidden="true"><span /></div>

          <div className="map-floating-filters">
            <button
              className={`location-pill ${isLiveTracking ? "tracking-active" : ""}`}
              onClick={toggleLiveTracking}
              aria-pressed={isLiveTracking}
              title={isLiveTracking ? "Klik untuk menghentikan pelacakan realtime" : "Aktifkan pelacakan lokasi GPS realtime"}
            >
              <LocateFixed size={17} className={isLiveTracking ? "live-pulse-icon" : ""} />
              <span>{isLiveTracking ? "Lacak Live Aktif" : "Lokasi Saya"}</span>
            </button>
            <div className="live-coords-pill" title="Koordinat titik tengah realtime">
              <MapPin size={13} />
              <span>{center.latitude.toFixed(5)}, {center.longitude.toFixed(5)}</span>
            </div>
            <button className="mobile-results-button" onClick={() => setMobileListOpen(true)}>
              <Store size={17} /> {filteredItems.length} hasil <ChevronDown size={16} />
            </button>
          </div>

          {locationMessage && <div className="map-notice">{locationMessage}</div>}

          <div className="accuracy-notice">
            <CircleAlert size={15} />
            Marker berbingkai kuning masih berupa perkiraan dan perlu diverifikasi.
          </div>

          {selected && (
            <article className="place-card">
              <button className="place-close" onClick={() => setSelectedId(null)} aria-label="Tutup detail">
                <X size={18} />
              </button>
              <div className="place-visual">
                <span className="place-category-icon" style={{ color: CATEGORY_CONFIG[selected.subCategory].color }}><CategoryIcon category={selected.subCategory} size={48} /></span>
                <small>{selected.subCategory}</small>
              </div>
              <div className="place-content">
                <LocationBadge status={selected.locationStatus} />
                <h2>{selected.brand}</h2>
                <p className="place-products">{selected.products}</p>
                <p className="place-address"><MapPin size={15} /> {selected.address}</p>
                <Link href={`/umkm/${selected.id}`}>Lihat profil usaha <ArrowRight size={16} /></Link>
              </div>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
