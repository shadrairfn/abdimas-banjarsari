"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock,
  Compass,
  ExternalLink,
  Globe,
  ImageIcon,
  Info,
  LocateFixed,
  MapPin,
  Menu,
  Moon,
  Navigation,
  PackageOpen,
  Phone,
  Radar,
  Search,
  Share2,
  ShieldCheck,
  Store,
  Sun,
  X,
} from "lucide-react";
import { CategoryIcon, CATEGORY_CONFIG } from "@/features/umkm/categories";
import { PhotoGallery } from "@/features/umkm/components/photo-gallery";
import { BANJARSARI_CENTER, type Umkm } from "@/features/umkm/types";
import { useTheme } from "@/features/map/use-theme";
import { distanceKm } from "@/lib/geo";

interface MapExplorerProps {
  initialItems: Umkm[];
  initialSelectedId?: string;
}

const subCategories = ["Semua", "Camilan", "Makanan", "Minuman", "Kue & Roti"] as const;
const UmkmMap = dynamic(
  () => import("@/features/map/components/umkm-map").then((module) => module.UmkmMap),
  { ssr: false, loading: () => <div className="map-loading">Memuat peta…</div> },
);

interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface ViewportState {
  center: typeof BANJARSARI_CENTER;
  bounds: ViewportBounds;
}

interface MapViewRequest {
  key: number;
  center: typeof BANJARSARI_CENTER;
  radiusKm: number | null;
  zoom?: number;
}

function LocationBadge({ status }: { status: Umkm["locationStatus"] }) {
  if (status === "verified") {
    return <span className="status-badge verified"><CheckCircle2 size={14} /> Terverifikasi</span>;
  }
  return <span className="status-badge estimated"><CircleAlert size={14} /> Titik perkiraan</span>;
}

export function MapExplorer({ initialItems, initialSelectedId }: MapExplorerProps) {
  const workspaceRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [subCategory, setSubCategory] = useState<(typeof subCategories)[number]>("Semua");
  const [locationScope, setLocationScope] = useState<"all" | "verified">("all");
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [isAllActive, setIsAllActive] = useState(true);
  const [isCustomRadius, setIsCustomRadius] = useState(false);
  const [customRadiusValue, setCustomRadiusValue] = useState("3");
  const { theme, toggleTheme } = useTheme();
  const [viewport, setViewport] = useState<ViewportState | null>(null);
  const [center, setCenter] = useState(BANJARSARI_CENTER);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [fitRequest, setFitRequest] = useState<MapViewRequest>({ key: 0, center: BANJARSARI_CENTER, radiusKm: null });
  const [mapMoving, setMapMoving] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(440);
  const [isResizing, setIsResizing] = useState(false);
  const [visibleRadiusKm, setVisibleRadiusKm] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  function formatOperatingHours(opening?: string, closing?: string) {
    if (!opening && !closing) return null;
    const openTrim = (opening || "").trim();
    const closeTrim = (closing || "").trim();
    if (!openTrim && !closeTrim) return null;
    if (openTrim && closeTrim && openTrim === closeTrim) {
      return { is24Hours: true, text: "Buka 24 Jam" };
    }
    return {
      is24Hours: false,
      text: `Buka: ${openTrim || "00:00"} - ${closeTrim || "24:00"} WIB`,
    };
  }

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
      const maximum = Math.min(600, bounds.width * 0.55);
      setSidebarWidth(Math.round(Math.min(maximum, Math.max(340, event.clientX - bounds.left))));
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



  const handleUserZoom = useCallback((newVisibleRadiusKm: number) => {
    setVisibleRadiusKm(newVisibleRadiusKm);
    // User zoomed/scrolled: auto-deselect active radius pill and switch to realtime radar
    setRadiusKm(null);
    setIsCustomRadius(false);
    setIsAllActive(false);
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
    return initialItems
      .map((item) => ({ item, distance: distanceKm(center, item) }))
      .filter(({ item }) => {
        const matchesQuery =
          !normalizedQuery ||
          `${item.brand} ${item.ownerName} ${item.products} ${item.address}`
            .toLocaleLowerCase("id-ID")
            .includes(normalizedQuery);
        const matchesCategory = subCategory === "Semua" || item.subCategory === subCategory;
        const matchesLocationScope = locationScope === "all" || item.locationStatus === "verified";

        let matchesArea = true;
        if (radiusKm !== null) {
          // Explicit radius (1, 5, 10, 20 km or custom)
          matchesArea = distanceKm(center, item) <= radiusKm;
        } else if (!isAllActive) {
          // Realtime radar mode: only outlets detected on map screen appear
          if (viewport?.bounds) {
            const { north, south, east, west } = viewport.bounds;
            matchesArea =
              item.latitude <= north &&
              item.latitude >= south &&
              item.longitude <= east &&
              item.longitude >= west;
          } else if (visibleRadiusKm !== null) {
            matchesArea = distanceKm(center, item) <= visibleRadiusKm;
          }
        }
        // If isAllActive is true, matchesArea remains true (all outlets shown)

        return matchesQuery && matchesCategory && matchesLocationScope && matchesArea;
      })
      .sort((a, b) => a.distance - b.distance);
  }, [center, initialItems, isAllActive, locationScope, query, radiusKm, subCategory, viewport, visibleRadiusKm]);

  const selected = useMemo(
    () => initialItems.find((item) => item.id === selectedId) ?? null,
    [initialItems, selectedId],
  );

  const [copied, setCopied] = useState(false);

  const handleViewportChange = useCallback((
    nextViewport: ViewportState,
    userInitiated: boolean,
  ) => {
    setViewport(nextViewport);
    if (userInitiated) {
      setCenter(nextViewport.center);
    }
  }, []);

  const selectItem = useCallback((item: Umkm) => {
    const targetCenter = { latitude: item.latitude, longitude: item.longitude };
    setSelectedId(item.id);
    setCenter(targetCenter);
    setFitRequest((current) => ({
      key: current.key + 1,
      center: targetCenter,
      radiusKm: null,
      zoom: 16,
    }));
    setSidebarWidth((prev) => Math.max(prev, 400));
    setMobileListOpen(true);
  }, []);

  const selectById = useCallback((id: string) => {
    const item = initialItems.find((candidate) => candidate.id === id);
    if (item) selectItem(item);
  }, [initialItems, selectItem]);

  const handleShareOrCopy = useCallback(() => {
    if (!selected) return;
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/?selected=${selected.id}` : "";
    const shareText = `${selected.brand} · ${selected.products} (Banjarsari, Garut)`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: selected.brand, text: shareText, url: shareUrl }).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [selected]);

  const handleOpenList = useCallback(() => {
    setSelectedId(null);
    setMobileListOpen(true);
    setSidebarWidth((prev) => Math.max(prev, 380));
    const listEl = document.getElementById("hasil-umkm");
    if (listEl) {
      listEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  function resetFilters() {
    setQuery("");
    setSubCategory("Semua");
    setLocationScope("all");
    setRadiusKm(null);
    setIsAllActive(true);
    setIsCustomRadius(false);
  }

  return (
    <main className="explorer-shell">
      <header className="topbar">
        <div className="header-left">
          <Link className="brand-lockup" href="/" aria-label="Peta UMKM Banjarsari">
            <span className="brand-mark">
              <Store size={22} strokeWidth={2.2} />
            </span>
            <span>
              <strong>Peta UMKM</strong>
              <small>Desa Banjarsari · Garut</small>
            </span>
          </Link>
        </div>

        <nav className="top-actions" aria-label="Navigasi utama">
          <Link href="/admin" className="admin-link-btn desktop-only">
            <ShieldCheck size={15} />
            <span>Dashboard admin</span>
          </Link>
          <button
            type="button"
            className="navbar-btn theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
            title={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            type="button"
            className="mobile-menu"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Buka menu navigasi"
          >
            <Menu size={20} />
          </button>
        </nav>
      </header>

      <section
        id="map-workspace"
        ref={workspaceRef}
        className="workspace"
        style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
      >
        {mobileListOpen && (
          <div
            className="mobile-sheet-backdrop"
            aria-hidden="true"
            onClick={() => setMobileListOpen(false)}
          />
        )}

        <aside className={`result-sidebar ${mobileListOpen ? "mobile-open" : ""}`}>
          <button
            className="sheet-handle"
            onClick={() => setMobileListOpen((open) => !open)}
            aria-label={mobileListOpen ? "Perkecil daftar UMKM" : "Perluas daftar UMKM"}
          >
            <span />
          </button>

          {selected ? (
            <div className="sidebar-detail-container">
              <div className="detail-panel-header">
                <button
                  type="button"
                  className="detail-back-button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Kembali ke daftar katalog"
                >
                  <ArrowLeft size={16} />
                  <span>Kembali ke daftar</span>
                </button>
                <button
                  type="button"
                  className="detail-panel-close"
                  onClick={() => {
                    setSelectedId(null);
                    setMobileListOpen(false);
                  }}
                  aria-label="Tutup detail"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="sidebar-detail-scrollable">
                <div
                  className="detail-hero-banner"
                  style={{
                    background: `linear-gradient(135deg, ${CATEGORY_CONFIG[selected.subCategory].background} 0%, rgba(15, 118, 110, 0.08) 100%)`,
                  }}
                >
                  <span
                    className="detail-hero-badge"
                    style={{ color: CATEGORY_CONFIG[selected.subCategory].color }}
                  >
                    <CategoryIcon category={selected.subCategory} size={48} />
                  </span>
                  <div className="detail-hero-status">
                    <LocationBadge status={selected.locationStatus} />
                  </div>
                </div>

                <div className="detail-title-section">
                  <h2>{selected.brand}</h2>
                  <p className="detail-owner-text">
                    {selected.subCategory} · Dikelola oleh <strong>{selected.ownerName}</strong>
                  </p>
                  <div className="detail-distance-tag">
                    <Compass size={13} />
                    <span>{distanceKm(center, selected).toFixed(1)} km dari titik pandang</span>
                  </div>
                </div>

                <div className="detail-quick-actions">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="detail-action-pill primary"
                    title="Buka rute navigasi di Google Maps"
                  >
                    <Navigation size={16} />
                    <span>Rute</span>
                  </a>
                  <button
                    type="button"
                    className="detail-action-pill"
                    onClick={handleShareOrCopy}
                    title="Salin tautan atau informasi outlet"
                  >
                    <Share2 size={16} />
                    <span>{copied ? "Tersalin!" : "Bagikan"}</span>
                  </button>
                  <button
                    type="button"
                    className="detail-action-pill"
                    onClick={() =>
                      setFitRequest((cur) => ({
                        key: cur.key + 1,
                        center: { latitude: selected.latitude, longitude: selected.longitude },
                        radiusKm: null,
                        zoom: 17,
                      }))
                    }
                    title="Pusatkan peta ke titik ini"
                  >
                    <LocateFixed size={16} />
                    <span>Pusatkan</span>
                  </button>
                </div>

                {/* Galeri Foto UMKM dengan In-App Lightbox Popup */}
                {selected.photos && selected.photos.length > 0 && (
                  <PhotoGallery photos={selected.photos} title={selected.brand} />
                )}

                <div className="detail-info-cards">
                  {/* Jam Operasional */}
                  {(() => {
                    const hours = formatOperatingHours(selected.openingHours, selected.closingHours);
                    if (!hours) return null;
                    return (
                      <div className="detail-info-item highlight-item">
                        <div className="detail-info-icon">
                          <Clock size={16} />
                        </div>
                        <div className="detail-info-body">
                          <small>Jam Operasional</small>
                          <strong className={hours.is24Hours ? "hours-24" : ""}>
                            {hours.text}
                          </strong>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Kontak / WhatsApp */}
                  {selected.contact && (
                    <div className="detail-info-item">
                      <div className="detail-info-icon">
                        <Phone size={16} />
                      </div>
                      <div className="detail-info-body">
                        <small>Kontak / WhatsApp</small>
                        <a
                          href={`https://wa.me/${selected.contact.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="detail-contact-link"
                          title="Hubungi via WhatsApp"
                        >
                          <span>{selected.contact}</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Website / Tautan */}
                  {selected.website && (
                    <div className="detail-info-item">
                      <div className="detail-info-icon">
                        <Globe size={16} />
                      </div>
                      <div className="detail-info-body">
                        <small>Website / Tautan</small>
                        <a
                          href={selected.website.startsWith("http") ? selected.website : `https://${selected.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="detail-contact-link"
                          title="Kunjungi website / katalog"
                        >
                          <span>{selected.website.replace(/^https?:\/\//, "")}</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="detail-info-item">
                    <div className="detail-info-icon">
                      <PackageOpen size={16} />
                    </div>
                    <div className="detail-info-body">
                      <small>Produk yang ditawarkan</small>
                      <strong>{selected.products}</strong>
                    </div>
                  </div>

                  <div className="detail-info-item">
                    <div className="detail-info-icon">
                      <MapPin size={16} />
                    </div>
                    <div className="detail-info-body">
                      <small>Alamat Lengkap</small>
                      <p>{selected.address}</p>
                    </div>
                  </div>

                  <div className="detail-info-item">
                    <div className="detail-info-icon">
                      <ShieldCheck size={16} />
                    </div>
                    <div className="detail-info-body">
                      <small>Status Akurasi Titik Usaha</small>
                      <p>
                        {selected.locationStatus === "verified"
                          ? "Koordinat terverifikasi langsung di lapangan oleh tim desa."
                          : selected.locationStatus === "outside"
                          ? "Titik usaha berada di luar batas administrasi inti Desa Banjarsari."
                          : "Titik koordinat perkiraan awal berdasarkan nama dusun/alamat."}
                      </p>
                    </div>
                  </div>

                  <div className="detail-info-item">
                    <div className="detail-info-icon">
                      <Compass size={16} />
                    </div>
                    <div className="detail-info-body">
                      <small>Titik Koordinat GPS</small>
                      <p className="coords-numeric">
                        {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="detail-footer-note">
                  <span>Data UMKM Desa Banjarsari, Bayongbong, Garut</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="sidebar-heading">
                <div>
                  <h1>Katalog UMKM</h1>
                  <p>Jelajahi ragam produk dan usaha lokal Desa Banjarsari</p>
                </div>
                <button
                  className="mobile-close"
                  onClick={() => setMobileListOpen(false)}
                  aria-label="Tutup daftar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="sidebar-controls">
                <div className="panel-search">
                  <Search size={18} className="search-icon" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      if (selectedId) setSelectedId(null);
                    }}
                    placeholder="Cari nama usaha, produk, alamat…"
                    aria-label="Cari nama usaha, produk, atau alamat"
                  />
                  {query && (
                    <button
                      type="button"
                      className="clear-search-btn"
                      onClick={() => {
                        setQuery("");
                        setSelectedId(null);
                      }}
                      aria-label="Hapus pencarian"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    className={`search-location-button ${isLiveTracking ? "active" : ""}`}
                    onClick={toggleLiveTracking}
                    aria-label={isLiveTracking ? "Hentikan pelacakan lokasi" : "Gunakan lokasi saya"}
                    title={isLiveTracking ? "Hentikan pelacakan lokasi" : "Gunakan lokasi saya"}
                  >
                    <LocateFixed size={18} className={isLiveTracking ? "live-pulse-icon" : ""} />
                  </button>
                </div>

                <div className="category-scroll-row" role="radiogroup" aria-label="Filter kategori produk">
                  {subCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`category-chip ${subCategory === category ? "active" : ""}`}
                      onClick={() => setSubCategory(category)}
                    >
                      {category !== "Semua" && (
                        <span
                          className="chip-cat-icon"
                          style={{ color: CATEGORY_CONFIG[category].color }}
                        >
                          <CategoryIcon category={category} size={16} />
                        </span>
                      )}
                      <span>{category}</span>
                    </button>
                  ))}
                </div>

                <div className="radius-control-bar">
                  <div className="radius-label">
                    <Compass size={16} />
                    <span>Radius:</span>
                  </div>
                  <div className="radius-pill-group" role="radiogroup" aria-label="Filter radius jarak">
                    <button
                      type="button"
                      className={`radius-pill ${isAllActive && radiusKm === null && !isCustomRadius ? "active" : ""}`}
                      onClick={() => {
                        if (isAllActive && radiusKm === null && !isCustomRadius) {
                          // Toggle off: switch to realtime screen radar detection
                          setIsAllActive(false);
                        } else {
                          // Toggle on: show all
                          setIsAllActive(true);
                          setRadiusKm(null);
                          setIsCustomRadius(false);
                          setFitRequest((cur) => ({
                            key: cur.key + 1,
                            center,
                            radiusKm: null,
                          }));
                        }
                      }}
                      title={
                        isAllActive && radiusKm === null && !isCustomRadius
                          ? "Klik lagi untuk menonaktifkan & hanya mendeteksi outlet di radar layar"
                          : "Tampilkan semua UMKM tanpa batasan radar"
                      }
                    >
                      Semua
                    </button>
                    {([1, 5, 10, 20] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`radius-pill ${!isAllActive && radiusKm === r && !isCustomRadius ? "active" : ""}`}
                        onClick={() => {
                          if (radiusKm === r && !isCustomRadius) {
                            // Clicking active pill toggles off to realtime radar
                            setRadiusKm(null);
                            setIsAllActive(false);
                          } else {
                            setRadiusKm(r);
                            setIsAllActive(false);
                            setIsCustomRadius(false);
                            setFitRequest((cur) => ({
                              key: cur.key + 1,
                              center,
                              radiusKm: r,
                            }));
                          }
                        }}
                        title={
                          !isAllActive && radiusKm === r && !isCustomRadius
                            ? "Klik lagi untuk beralih ke deteksi radar realtime"
                            : `Filter radius ${r} km`
                        }
                      >
                        {r} km
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`radius-pill ${isCustomRadius ? "active" : ""}`}
                      onClick={() => {
                        if (isCustomRadius) {
                          setIsCustomRadius(false);
                          setRadiusKm(null);
                          setIsAllActive(false);
                        } else {
                          setIsCustomRadius(true);
                          setIsAllActive(false);
                          const val = parseFloat(customRadiusValue);
                          const next = !isNaN(val) && val > 0 ? val : 3;
                          setRadiusKm(next);
                          setFitRequest((cur) => ({
                            key: cur.key + 1,
                            center,
                            radiusKm: next,
                          }));
                        }
                      }}
                    >
                      Kustom
                    </button>
                  </div>
                </div>

                {isCustomRadius && (
                  <div className="custom-radius-input-row">
                    <span className="custom-radius-hint">Radius khusus:</span>
                    <div className="custom-radius-input-wrap">
                      <input
                        type="number"
                        min="0.1"
                        max="100"
                        step="0.5"
                        value={customRadiusValue}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCustomRadiusValue(v);
                          const parsed = parseFloat(v);
                          if (!isNaN(parsed) && parsed > 0) {
                            setRadiusKm(parsed);
                            setIsAllActive(false);
                            setFitRequest((cur) => ({
                              key: cur.key + 1,
                              center,
                              radiusKm: parsed,
                            }));
                          } else {
                            setRadiusKm(null);
                          }
                        }}
                        placeholder="3"
                        aria-label="Input radius kustom dalam km"
                      />
                      <span>km</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="result-summary" aria-live="polite">
                <span>
                  <strong>{filteredItems.length}</strong> UMKM
                  {subCategory !== "Semua" ? ` · ${subCategory}` : ""}
                  {radiusKm !== null ? ` · ≤${radiusKm} km` : !isAllActive ? " · Radar Deteksi Layar" : ""}
                </span>
                {(query || subCategory !== "Semua" || locationScope !== "all" || radiusKm !== null || !isAllActive) && (
                  <button type="button" className="reset-filter-text" onClick={resetFilters}>
                    Reset filter
                  </button>
                )}
              </div>

              <div id="hasil-umkm" className="result-list">
                {filteredItems.length ? (
                  filteredItems.map(({ item, distance }) => (
                    <article
                      key={item.id}
                      className={`result-card ${selectedId === item.id ? "selected" : ""}`}
                      onClick={() => selectItem(item)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Pilih ${item.brand}`}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectItem(item);
                        }
                      }}
                    >
                      <span
                        className="category-icon"
                        style={{
                          color: CATEGORY_CONFIG[item.subCategory].color,
                          background: CATEGORY_CONFIG[item.subCategory].background,
                        }}
                      >
                        <CategoryIcon category={item.subCategory} size={24} />
                      </span>
                      <div className="result-copy">
                        <div className="result-topline">
                          <strong>{item.brand}</strong>
                          <small className="distance-badge">{distance.toFixed(1)} km</small>
                        </div>
                        <p className="product-line">{item.products}</p>
                        <div className="result-meta">
                          <span>{item.subCategory}</span> · {item.address.split(",")[0]}
                        </div>
                        <LocationBadge status={item.locationStatus} />
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-results">
                    <Store size={36} strokeWidth={1.5} />
                    <strong>Tidak ada UMKM yang cocok</strong>
                    <p>Coba gunakan kata kunci lain atau pilih kategori Semua.</p>
                    <button type="button" onClick={resetFilters}>
                      Tampilkan Semua UMKM
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

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
          >
            <span />
          </button>
        </aside>

        <div className="map-stage">
          <UmkmMap
            items={filteredItems.map(({ item }) => item)}
            selectedId={selectedId}
            center={center}
            userLocation={userLocation}
            radiusKm={radiusKm}
            fitRequest={fitRequest}
            theme={theme}
            onSelect={selectById}
            onViewportChange={handleViewportChange}
            onMovingChange={setMapMoving}
            onZoomRadiusChange={setVisibleRadiusKm}
            onUserZoom={handleUserZoom}
          />

          <div className="map-floating-filters">
            <button
              className={`location-pill ${isLiveTracking ? "tracking-active" : ""}`}
              onClick={toggleLiveTracking}
              aria-pressed={isLiveTracking}
              title={
                isLiveTracking
                  ? "Klik untuk menghentikan pelacakan realtime"
                  : "Aktifkan pelacakan lokasi GPS realtime"
              }
            >
              <LocateFixed size={17} className={isLiveTracking ? "live-pulse-icon" : ""} />
              <span>{isLiveTracking ? "Lacak Live Aktif" : "Lokasi Saya"}</span>
            </button>
            <div className="live-coords-pill" title="Koordinat titik tengah realtime">
              <MapPin size={15} />
              <span>
                {center.latitude.toFixed(5)}, {center.longitude.toFixed(5)}
              </span>
            </div>
            {visibleRadiusKm !== null && (
              <div
                className={`live-radius-pill ${!isAllActive && radiusKm === null ? "active-radar-pill" : ""}`}
                title={
                  !isAllActive && radiusKm === null
                    ? "Mode Radar Realtime: hanya outlet dalam area layar yang tertampil di list dan peta"
                    : "Radius jangkauan area yang sedang tertampil di layar secara realtime saat zoom"
                }
              >
                <Radar size={15} />
                <span>
                  {!isAllActive && radiusKm === null
                    ? `Radar: ~${visibleRadiusKm} km`
                    : `Radius: ~${visibleRadiusKm} km`}
                </span>
              </div>
            )}
            {!mobileListOpen && (
              <button className="mobile-results-button" onClick={() => setMobileListOpen(true)}>
                <Store size={16} /> {filteredItems.length} hasil
              </button>
            )}
          </div>

          {locationMessage && <div className="map-notice">{locationMessage}</div>}
        </div>
      </section>

      {aboutModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setAboutModalOpen(false)}>
          <section
            className="about-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setAboutModalOpen(false)} aria-label="Tutup dialog">
              <X size={17} />
            </button>
            <div className="about-modal-header">
              <span className="about-modal-mark">
                <Store size={20} />
              </span>
              <div>
                <h2 id="about-title">Peta UMKM Banjarsari</h2>
                <p>Pengabdian Masyarakat · Desa Banjarsari, Bayongbong, Garut</p>
              </div>
            </div>
            <div className="about-modal-body">
              <p>
                Sistem informasi geografis direktori UMKM ini dirancang untuk memetakan dan mempromosikan ragam potensi
                usaha mikro, kecil, dan menengah lokal, mulai dari sentra camilan, makanan khas, minuman, hingga aneka
                kue dan roti.
              </p>
              <div className="about-features-grid">
                <div className="about-feature-card">
                  <div className="about-feature-title">
                    <span className="about-feature-icon">
                      <MapPin size={15} />
                    </span>
                    <strong>Pemetaan Spasial</strong>
                  </div>
                  <p>Visualisasi persebaran titik usaha di tiap kampung untuk memudahkan penelusuran lokasi.</p>
                </div>
                <div className="about-feature-card">
                  <div className="about-feature-title">
                    <span className="about-feature-icon">
                      <Search size={15} />
                    </span>
                    <strong>Eksplorasi Produk Cepat</strong>
                  </div>
                  <p>Penyaringan instan berdasarkan kategori dan produk unggulan desa.</p>
                </div>
                <div className="about-feature-card">
                  <div className="about-feature-title">
                    <span className="about-feature-icon">
                      <ShieldCheck size={15} />
                    </span>
                    <strong>Transparansi Data Lapangan</strong>
                  </div>
                  <p>Pembedaan akurasi koordinat terverifikasi dengan sertifikasi legalitas usaha (NIB) desa.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div
          className="mobile-nav-backdrop"
          role="presentation"
          onClick={() => setMobileNavOpen(false)}
        >
          <aside
            className="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu Navigasi Mobile"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-nav-header">
              <div className="mobile-nav-brand">
                <span className="brand-mark">
                  <Store size={18} strokeWidth={2.2} />
                </span>
                <div>
                  <strong>Peta UMKM Banjarsari</strong>
                  <small>Menu & Navigasi Cepat</small>
                </div>
              </div>
              <button
                type="button"
                className="mobile-nav-close"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Tutup menu navigasi"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mobile-nav-body">
              <div className="mobile-nav-group">
                <span className="mobile-nav-group-title">Eksplorasi</span>

                <button
                  type="button"
                  className="mobile-nav-item"
                  onClick={() => {
                    setMobileNavOpen(false);
                    setSelectedId(null);
                    setMobileListOpen(true);
                  }}
                >
                  <div className="mobile-nav-item-icon">
                    <Store size={18} />
                  </div>
                  <div className="mobile-nav-item-text">
                    <strong>Katalog & Daftar UMKM</strong>
                    <small>Cari & filter produk desa ({filteredItems.length} usaha)</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="mobile-nav-item"
                  onClick={() => {
                    setMobileNavOpen(false);
                    setAboutModalOpen(true);
                  }}
                >
                  <div className="mobile-nav-item-icon">
                    <Info size={18} />
                  </div>
                  <div className="mobile-nav-item-text">
                    <strong>Tentang Peta Desa</strong>
                    <small>Informasi pemetaan & program desa</small>
                  </div>
                </button>
              </div>

              <div className="mobile-nav-group">
                <span className="mobile-nav-group-title">Pengaturan & Kelola</span>

                <Link
                  href="/admin"
                  className="mobile-nav-item"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <div className="mobile-nav-item-icon admin-icon">
                    <ShieldCheck size={18} />
                  </div>
                  <div className="mobile-nav-item-text">
                    <strong>Dashboard Admin</strong>
                    <small>Kelola data UMKM & admin desa</small>
                  </div>
                  <ExternalLink size={14} className="mobile-nav-item-arrow" />
                </Link>

                <button
                  type="button"
                  className="mobile-nav-item"
                  onClick={toggleTheme}
                >
                  <div className="mobile-nav-item-icon">
                    {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                  </div>
                  <div className="mobile-nav-item-text">
                    <strong>Tampilan Tema</strong>
                    <small>{theme === "dark" ? "Mode Gelap aktif (Ketuk untuk Terang)" : "Mode Terang aktif (Ketuk untuk Gelap)"}</small>
                  </div>
                </button>
              </div>
            </div>

            <div className="mobile-nav-footer">
              <p>Desa Banjarsari · Kec. Bayongbong · Kab. Garut</p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
