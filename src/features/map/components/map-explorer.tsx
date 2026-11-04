"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Columns2,
  ExternalLink,
  Globe,
  Info,
  List,
  Loader2,
  Locate,
  Map as MapIcon,
  MapPin,
  Minus,
  Moon,
  Navigation,
  Package,
  Phone,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Sun,
  Users,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Dialog } from "@/components/dialog";
import { Rail } from "@/components/rail";
import { SelectMenu, type SelectOption } from "@/components/select-menu";
import { useCategoryNames } from "@/features/categories/category-provider";
import type { MapControls } from "@/features/map/components/umkm-map";
import { getDefaultMapCenter } from "@/features/map/default-center";
import { useMapProvider } from "@/features/map/google-maps-loader";
import { loadMapView, type MapCamera, saveMapView } from "@/features/map/view-state";
import { CategoryIcon } from "@/features/umkm/categories";
import {
  compareHref,
  loadCompareIds,
  saveCompareIds,
  toggleCompareId,
} from "@/features/umkm/compare";
import { ComparePickerDialog } from "@/features/umkm/components/compare-picker-dialog";
import { PhotoGallery } from "@/features/umkm/components/photo-gallery";
import { ProductCatalog } from "@/features/umkm/components/product-catalog";
import { coverPhoto } from "@/features/umkm/cover-photo";
import {
  displayText,
  formatDistance,
  formatOperatingHours,
  socialLabel,
  socialUrl,
  villageName,
  whatsappUrl,
} from "@/features/umkm/format";
import type { Umkm } from "@/features/umkm/types";
import { type Coordinates, distanceKm } from "@/lib/geo";
import { useTheme } from "@/lib/theme/use-theme";
import { usePersistentState } from "@/lib/ui/use-persistent-state";

interface MapExplorerProps {
  initialItems: Umkm[];
  initialSelectedId?: string;
}

type CategoryFilter = string;
// A radius in km around the map center, every UMKM, or only what is inside the visible map.
type Area = "all" | "viewport" | number;

const UmkmMap = dynamic(
  () => import("@/features/map/components/umkm-map").then((module) => module.UmkmMap),
  { ssr: false, loading: () => <div className="map-canvas" /> },
);

const AREA_OPTIONS: SelectOption<string>[] = [
  { value: "all", label: "Semua" },
  { value: "0.05", label: "≤ 50 m" },
  { value: "1", label: "≤ 1 km" },
  { value: "5", label: "≤ 5 km" },
  { value: "10", label: "≤ 10 km" },
  { value: "20", label: "≤ 20 km" },
  { value: "viewport", label: "Area peta" },
];
const DEFAULT_AREA: Area = "viewport";
const INITIAL_VIEW_RADIUS_KM = 0.05;
const FOCUS_MIN_ZOOM = 15.5;
const DETAIL_PANEL_PADDING = 396;
const PHONE_DOCK_PADDING = 200;
const PHONE_QUERY = "(max-width: 767px)";
const RESULTS_TOP = 120;
const RESULTS_BOTTOM = 240;
const RESULTS_TOP_PHONE = 170;
const RESULTS_BOTTOM_PHONE = 280;
const SEARCH_DEBOUNCE_MS = 350;
const MESSAGE_DURATION_MS = 5000;
const USER_ZOOM = 16;
const NEARBY_ZOOM = 15;
const HIGH_ACCURACY_TIMEOUT_MS = 10000;
const LOW_ACCURACY_TIMEOUT_MS = 20000;
const POSITION_MAX_AGE_MS = 10000;

interface ViewportState {
  center: Coordinates;
  zoom: number;
  bounds: { north: number; south: number; east: number; west: number };
}

interface MapViewRequest {
  key: number;
  center: Coordinates;
  radiusKm: number | null;
  zoom?: number;
  minZoom?: number;
  bounds?: [number, number, number, number];
  padding?: { top?: number; right?: number; bottom?: number };
  instant?: boolean;
  skipIfMoving?: boolean;
}

interface RankedUmkm {
  item: Umkm;
  distance: number;
}

interface RankFilters {
  query: string;
  category: CategoryFilter;
  area: Area;
  center: Coordinates;
  viewport: ViewportState | null;
}

// "off" -> asking the browser for a position -> "tracking" the moving dot.
type LocationState = "off" | "locating" | "tracking";

function areaToValue(area: Area) {
  return typeof area === "number" ? String(area) : area;
}

function parseSavedArea(value: string | number | undefined): Area | null {
  if (typeof value === "number" && value > 0) {
    return value;
  }

  if (value === "all" || value === "viewport") {
    return value;
  }

  return null;
}

/** Every word of the query must appear somewhere in the name, owner, products, address or category. */
function matchesQuery(item: Umkm, normalizedQuery: string) {
  const searchableText = [
    item.brand,
    item.ownerName,
    item.products,
    item.address,
    item.subCategory,
    villageName(item.address),
  ]
    .join(" ")
    .toLocaleLowerCase("id-ID");

  return normalizedQuery.split(/\s+/).every((word) => searchableText.includes(word));
}

/**
 * Filter and sort the UMKM by distance from the map center. A search looks at every UMKM,
 * not only the ones inside the chosen distance, otherwise a place far from the center could never be found.
 */
function rankItems(
  items: Umkm[],
  { query, category, area, center, viewport }: RankFilters,
): RankedUmkm[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
  const isSearching = normalizedQuery.length > 0;

  return items
    .map((item) => ({ item, distance: distanceKm(center, item) }))
    .filter(({ item, distance }) => {
      if (category !== "Semua" && item.subCategory !== category) {
        return false;
      }

      if (isSearching) {
        return matchesQuery(item, normalizedQuery);
      }

      if (typeof area === "number") {
        return distance <= area;
      }

      if (area === "viewport" && viewport) {
        const { north, south, east, west } = viewport.bounds;

        return (
          item.latitude <= north &&
          item.latitude >= south &&
          item.longitude <= east &&
          item.longitude >= west
        );
      }

      return true;
    })
    .sort((a, b) => a.distance - b.distance);
}

function resultBounds(entries: RankedUmkm[]): [number, number, number, number] {
  const latitudes = entries.map(({ item }) => item.latitude);
  const longitudes = entries.map(({ item }) => item.longitude);

  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}

function areaLabel(area: Area) {
  return AREA_OPTIONS.find((option) => option.value === areaToValue(area))?.label ?? "";
}

function focusPadding(isDetailOpen: boolean) {
  if (window.matchMedia(PHONE_QUERY).matches) {
    return { bottom: PHONE_DOCK_PADDING };
  }

  return isDetailOpen ? { right: DETAIL_PANEL_PADDING } : {};
}

// Search results are fitted between the search card on top and the carousel at the bottom.
function resultsPadding(isDetailOpen: boolean) {
  if (window.matchMedia(PHONE_QUERY).matches) {
    return { top: RESULTS_TOP_PHONE, bottom: RESULTS_BOTTOM_PHONE };
  }

  return {
    top: RESULTS_TOP,
    bottom: RESULTS_BOTTOM,
    right: isDetailOpen ? DETAIL_PANEL_PADDING : 0,
  };
}

function Legend() {
  return null;
}

function UmkmCard({
  entry,
  selected,
  compared,
  mobile = false,
  onSelect,
  onCompare,
  onClose,
}: {
  entry: RankedUmkm;
  selected: boolean;
  compared: boolean;
  mobile?: boolean;
  onSelect: (item: Umkm) => void;
  onCompare: (item: Umkm) => void;
  onClose?: () => void;
}) {
  const { item, distance } = entry;
  const photoUrl = coverPhoto(item);

  return (
    <div
      className={`cc${selected ? " sel" : ""}${mobile ? " mobile" : ""}`}
      data-umkm-id={item.id}
      onClick={() => onSelect(item)}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span className={`sq map-card-thumbnail${photoUrl ? " has-photo" : ""}`}>
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={`Foto ${displayText(item.brand)}`} loading="lazy" />
          ) : (
            <CategoryIcon category={item.subCategory} />
          )}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="ell fw5">{displayText(item.brand)}</div>
          <div className="mut ell" style={{ fontSize: 13 }}>
            {item.subCategory} · {villageName(item.address)}
          </div>
        </div>
        <span className="dist">{formatDistance(distance)}</span>
        {mobile && onClose && (
          <button
            type="button"
            className="btn ic sm g map-card-close"
            aria-label="Tutup kartu UMKM"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
          >
            <X className="i sm" />
          </button>
        )}
      </div>
      <div className="mut ell" style={{ fontSize: 13 }}>
        {displayText(item.products, "sentence")}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className={`btn ic sm${compared ? "" : " o"}`}
          aria-pressed={compared}
          aria-label={`Bandingkan ${displayText(item.brand)}`}
          title={compared ? "Hapus dari perbandingan" : "Bandingkan"}
          onClick={(event) => {
            event.stopPropagation();
            onCompare(item);
          }}
        >
          <Columns2 className="i sm" />
        </button>
        <Link
          className="btn o sm"
          href={`/umkm/${item.id}`}
          onClick={(event) => event.stopPropagation()}
        >
          Profil
        </Link>
        <Link
          className="btn sm"
          href={`/rute/${item.id}`}
          onClick={(event) => event.stopPropagation()}
        >
          <Navigation className="i sm" />
          Rute
        </Link>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <div className="irow">
      <Icon className="i" />
      <span>{children}</span>
    </div>
  );
}

export function MapExplorer({ initialItems, initialSelectedId }: MapExplorerProps) {
  const categoryNames = useCategoryNames();
  const CATEGORY_FILTERS: CategoryFilter[] = ["Semua", ...categoryNames];
  const CATEGORY_OPTIONS = CATEGORY_FILTERS.map((value) => ({
    value,
    label: value === "Semua" ? "Semua kategori" : value,
  }));
  const { theme, toggleTheme } = useTheme();
  const mapProvider = useMapProvider();
  const router = useRouter();
  const [compareFirst, setCompareFirst] = useState<Umkm | null>(null);
  // A link with ?selected= wins over the last view of this browser tab.
  const [restored] = useState(() => (initialSelectedId ? null : loadMapView()));
  const startItem =
    initialItems.find((item) => item.id === (initialSelectedId ?? restored?.selectedId)) ?? null;
  const isOpenedFromLink = Boolean(initialSelectedId && startItem);
  const hasInitialDetail =
    Boolean(startItem) && (isOpenedFromLink || restored?.detailOpen === true);
  const startCenter: Coordinates =
    isOpenedFromLink && startItem
      ? { latitude: startItem.latitude, longitude: startItem.longitude }
      : (restored?.center ?? getDefaultMapCenter(initialItems));
  const startArea: Area = isOpenedFromLink
    ? "all"
    : (parseSavedArea(restored?.area) ?? DEFAULT_AREA);

  const [query, setQuery] = useState(restored?.query ?? "");
  const [category, setCategory] = useState<CategoryFilter>(
    CATEGORY_FILTERS.find((value) => value === restored?.category) ?? "Semua",
  );
  const [area, setArea] = useState<Area>(startArea);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isListOpen, setIsListOpen] = usePersistentState("map:list-open", false);
  // Hides the cards at the bottom so the whole map is visible.
  const [isCarouselHidden, setIsCarouselHidden] = useState(restored?.carouselHidden === true);
  const [selectedId, setSelectedId] = useState<string | null>(startItem?.id ?? null);
  const [isDetailOpen, setIsDetailOpen] = useState(hasInitialDetail);
  const [center, setCenter] = useState<Coordinates>(startCenter);
  const [camera, setCamera] = useState<MapCamera | null>(restored?.camera ?? null);
  const [viewport, setViewport] = useState<ViewportState | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("off");
  // While true the map follows the moving dot; dragging the map lets go.
  const [shouldFollowUser, setShouldFollowUser] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>(() =>
    loadCompareIds().filter((id) => initialItems.some((item) => item.id === id)),
  );
  const [fitRequest, setFitRequest] = useState<MapViewRequest>(() => {
    if (isOpenedFromLink && startItem) {
      return { key: 0, center: startCenter, radiusKm: null, zoom: USER_ZOOM };
    }

    if (restored?.camera) {
      const { latitude, longitude, zoom } = restored.camera;

      return {
        key: 0,
        center: { latitude, longitude },
        radiusKm: null,
        zoom,
        padding: focusPadding(hasInitialDetail),
        instant: true,
      };
    }

    const viewRadiusKm = startArea === "viewport" ? INITIAL_VIEW_RADIUS_KM : null;

    return {
      key: 0,
      center: startCenter,
      radiusKm: typeof startArea === "number" ? startArea : viewRadiusKm,
    };
  });
  const watchIdRef = useRef<number | null>(null);
  const hasFixRef = useRef(false);
  const followRef = useRef(false);
  const areaRef = useRef(area);
  const detailOpenRef = useRef(isDetailOpen);
  const searchTimerRef = useRef<number | null>(null);
  const messageTimerRef = useRef<number | null>(null);
  const mapControlsRef = useRef<MapControls | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const ranked = useMemo(
    () => rankItems(initialItems, { query, category, area, center, viewport }),
    [area, category, center, initialItems, query, viewport],
  );
  const isSearching = query.trim().length > 0;

  const mapItems = useMemo(() => ranked.map((entry) => entry.item), [ranked]);
  const activeIndex = ranked.findIndex((entry) => entry.item.id === selectedId);
  const activeEntry = ranked[activeIndex] ?? null;
  const detailItem = isDetailOpen
    ? (initialItems.find((item) => item.id === selectedId) ?? null)
    : null;
  const detailDistance = detailItem ? distanceKm(center, detailItem) : 0;
  const compareItems = compareIds
    .map((id) => initialItems.find((item) => item.id === id))
    .filter((item): item is Umkm => Boolean(item));

  const focusItem = useCallback((item: Umkm, isOpenDetail: boolean) => {
    setSelectedId(item.id);
    setIsDetailOpen(isOpenDetail);
    setFitRequest((current) => ({
      key: current.key + 1,
      center: { latitude: item.latitude, longitude: item.longitude },
      radiusKm: null,
      minZoom: FOCUS_MIN_ZOOM,
      padding: focusPadding(isOpenDetail),
    }));
  }, []);

  const closeDetail = useCallback(() => {
    setIsDetailOpen(false);
    const current = initialItems.find((item) => item.id === selectedId);
    if (!current) {
      return;
    }

    setFitRequest((request) => ({
      key: request.key + 1,
      center: { latitude: current.latitude, longitude: current.longitude },
      radiusKm: null,
      padding: focusPadding(false),
    }));
  }, [initialItems, selectedId]);

  const selectById = useCallback(
    (id: string) => {
      const item = initialItems.find((candidate) => candidate.id === id);
      if (item) {
        focusItem(item, true);
      }
    },
    [focusItem, initialItems],
  );

  const stepSelection = useCallback(
    (step: number) => {
      const next = ranked[activeIndex + step];
      if (next) {
        focusItem(next.item, isDetailOpen);
      }
    },
    [activeIndex, isDetailOpen, focusItem, ranked],
  );

  const changeArea = useCallback(
    (value: string) => {
      const nextArea: Area = value === "all" || value === "viewport" ? value : Number(value);
      setArea(nextArea);
      if (typeof nextArea === "number") {
        setFitRequest((current) => ({
          key: current.key + 1,
          center,
          radiusKm: nextArea,
          padding: {},
        }));
      }
    },
    [center],
  );

  const handleViewportChange = useCallback(
    (nextViewport: ViewportState, isUserInitiated: boolean) => {
      setViewport(nextViewport);
      setCamera({ ...nextViewport.center, zoom: nextViewport.zoom });
      if (isUserInitiated) {
        setCenter(nextViewport.center);
        followRef.current = false;
        setShouldFollowUser(false);
      }
    },
    [],
  );

  // Zooming by hand switches the list to "what is on the map".
  const handleUserZoom = useCallback(() => setArea("viewport"), []);

  function toggleCompare(item: Umkm) {
    if (!compareIds.includes(item.id)) {
      setCompareFirst(item);
    }

    setCompareIds((current) => toggleCompareId(current, item.id));
  }

  function centerOnItem() {
    if (!detailItem) {
      return;
    }

    const target = { latitude: detailItem.latitude, longitude: detailItem.longitude };
    setCenter(target);
    setFitRequest((current) => ({
      key: current.key + 1,
      center: target,
      radiusKm: null,
      zoom: USER_ZOOM,
      padding: focusPadding(true),
    }));
  }

  function shareItem() {
    if (!detailItem) {
      return;
    }

    const shareUrl = `${window.location.origin}/umkm/${detailItem.id}`;
    const shareText = `${displayText(detailItem.brand)} · ${displayText(detailItem.products, "sentence")} (Banjarsari, Garut)`;
    if (navigator.share) {
      navigator
        .share({ title: displayText(detailItem.brand), text: shareText, url: shareUrl })
        .catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  }

  // Search -------------------------------------------------------------

  /** Move the map to the results: one result is centered, several are fitted into view. */
  function fitToResults(entries: RankedUmkm[]) {
    const [first] = entries;
    if (!first) {
      return;
    }

    if (entries.length === 1) {
      const target = { latitude: first.item.latitude, longitude: first.item.longitude };
      setSelectedId(first.item.id);
      setCenter(target);
      setFitRequest((current) => ({
        key: current.key + 1,
        center: target,
        radiusKm: null,
        minZoom: FOCUS_MIN_ZOOM,
        padding: focusPadding(isDetailOpen),
      }));

      return;
    }

    const bounds = resultBounds(entries);
    const middle = {
      latitude: (bounds[1] + bounds[3]) / 2,
      longitude: (bounds[0] + bounds[2]) / 2,
    };
    setCenter(middle);
    setFitRequest((current) => ({
      key: current.key + 1,
      center: middle,
      radiusKm: null,
      bounds,
      padding: resultsPadding(isDetailOpen),
    }));
  }

  function runSearch(nextQuery: string, nextCategory: CategoryFilter) {
    if (!nextQuery.trim()) {
      // Back from a search: show the chosen radius again.
      if (typeof area === "number") {
        setFitRequest((current) => ({ key: current.key + 1, center, radiusKm: area, padding: {} }));
      }

      return;
    }

    fitToResults(
      rankItems(initialItems, { query: nextQuery, category: nextCategory, area, center, viewport }),
    );
  }

  function changeQuery(value: string) {
    setQuery(value);
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = window.setTimeout(
      () => runSearch(value, category),
      SEARCH_DEBOUNCE_MS,
    );
  }

  function changeCategory(value: CategoryFilter) {
    setCategory(value);
    if (query.trim()) {
      runSearch(query, value);
    }
  }

  function submitSearch() {
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
    }

    const [first] = rankItems(initialItems, { query, category, area, center, viewport });
    if (first) {
      focusItem(first.item, false);
    }
  }

  // My location --------------------------------------------------------

  function flashMessage(message: string) {
    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
    }

    setLocationMessage(message);
    messageTimerRef.current = window.setTimeout(
      () => setLocationMessage(null),
      MESSAGE_DURATION_MS,
    );
  }

  function clearLocationWatch() {
    if (watchIdRef.current === null) {
      return;
    }

    navigator.geolocation?.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
  }

  function stopLiveTracking() {
    clearLocationWatch();
    hasFixRef.current = false;
    followRef.current = false;
    setShouldFollowUser(false);
    setUserLocation(null);
    setLocationState("off");
  }

  /** Center on the visitor while preserving the selected search distance. */
  function handleFirstFix(position: Coordinates) {
    const currentArea = areaRef.current;
    const viewRadiusKm = typeof currentArea === "number" ? currentArea : INITIAL_VIEW_RADIUS_KM;
    setCenter(position);

    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
    }

    setLocationMessage(null);
    setFitRequest((current) => ({
      key: current.key + 1,
      center: position,
      radiusKm: currentArea === "all" ? null : viewRadiusKm,
      zoom: currentArea === "all" ? NEARBY_ZOOM : undefined,
      padding: focusPadding(detailOpenRef.current),
    }));
  }

  function handlePosition(coords: GeolocationCoordinates) {
    const position = { latitude: coords.latitude, longitude: coords.longitude };
    setUserLocation(position);

    if (!hasFixRef.current) {
      hasFixRef.current = true;
      followRef.current = true;
      setShouldFollowUser(true);
      setLocationState("tracking");
      handleFirstFix(position);

      return;
    }

    if (followRef.current) {
      setCenter(position);
      setFitRequest((current) => ({
        key: current.key + 1,
        center: position,
        radiusKm: null,
        padding: focusPadding(detailOpenRef.current),
        skipIfMoving: true,
      }));
    }
  }

  function handleLocationError(error: GeolocationPositionError, isHighAccuracy: boolean) {
    // Desktop browsers often cannot give a GPS fix in time; ask again for the network based location.
    if (error.code !== error.PERMISSION_DENIED && isHighAccuracy && !hasFixRef.current) {
      clearLocationWatch();
      startLocationWatch(false);

      return;
    }

    // A weak signal after the first fix is not fatal, the dot just stays where it was.
    if (hasFixRef.current && error.code === error.TIMEOUT) {
      return;
    }

    stopLiveTracking();
    if (error.code === error.PERMISSION_DENIED) {
      flashMessage(
        window.isSecureContext
          ? "Izin akses lokasi ditolak oleh peramban."
          : "Lokasi hanya bisa diakses lewat HTTPS atau localhost.",
      );
    } else if (error.code === error.POSITION_UNAVAILABLE) {
      flashMessage("Sinyal GPS / lokasi tidak tersedia.");
    } else if (error.code === error.TIMEOUT) {
      flashMessage("Waktu pencarian lokasi habis.");
    } else {
      flashMessage("Gagal mengakses lokasi.");
    }
  }

  function startLocationWatch(isHighAccuracy: boolean) {
    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => handlePosition(coords),
      (error) => handleLocationError(error, isHighAccuracy),
      {
        enableHighAccuracy: isHighAccuracy,
        maximumAge: POSITION_MAX_AGE_MS,
        timeout: isHighAccuracy ? HIGH_ACCURACY_TIMEOUT_MS : LOW_ACCURACY_TIMEOUT_MS,
      },
    );
  }

  function startLiveTracking() {
    if (!navigator.geolocation) {
      flashMessage("Perangkat ini tidak mendukung akses lokasi GPS.");

      return;
    }

    clearLocationWatch();
    hasFixRef.current = false;
    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
    }

    setLocationMessage("Mencari lokasi Anda…");
    setLocationState("locating");
    startLocationWatch(true);
  }

  /** Off -> start. Tracking but the map was dragged away -> come back. Tracking and following -> stop. */
  function handleLocateClick() {
    if (locationState === "off") {
      startLiveTracking();

      return;
    }

    if (locationState === "tracking" && !shouldFollowUser && userLocation) {
      followRef.current = true;
      setShouldFollowUser(true);
      setCenter(userLocation);
      setFitRequest((current) => ({
        key: current.key + 1,
        center: userLocation,
        radiusKm: null,
        zoom: USER_ZOOM,
        padding: focusPadding(isDetailOpen),
      }));

      return;
    }

    stopLiveTracking();
    flashMessage("Pelacakan lokasi dinonaktifkan.");
  }

  useEffect(() => {
    areaRef.current = area;
  }, [area]);
  useEffect(() => {
    detailOpenRef.current = isDetailOpen;
  }, [isDetailOpen]);

  // Remember the view so coming back from a profile shows the same map.
  useEffect(() => {
    saveMapView({
      query,
      category,
      area,
      selectedId,
      detailOpen: isDetailOpen,
      center,
      camera,
      carouselHidden: isCarouselHidden,
    });
  }, [area, camera, isCarouselHidden, category, center, isDetailOpen, query, selectedId]);

  useEffect(() => {
    saveCompareIds(compareIds);
  }, [compareIds]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
      }

      if (searchTimerRef.current !== null) {
        window.clearTimeout(searchTimerRef.current);
      }

      if (messageTimerRef.current !== null) {
        window.clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isAboutOpen && !isListOpen) {
        closeDetail();
      }
    }
    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isAboutOpen, closeDetail, isListOpen]);

  // Keep the active card visible inside the horizontal carousel.
  useEffect(() => {
    const container = carouselRef.current;
    const card = container?.querySelector<HTMLElement>(`[data-umkm-id="${activeEntry?.item.id}"]`);
    if (container && card) {
      container.scrollTo({ left: Math.max(0, card.offsetLeft - 2), behavior: "smooth" });
    }
  }, [activeEntry?.item.id]);

  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const searchCard = (
    <div className={`fcard map-search${isDetailOpen ? " narrow" : ""}`}>
      <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <label className="inp" style={{ flex: 1 }}>
            <Search className="i" />
            <input
              type="search"
              placeholder="Cari nama, produk, pemilik, atau kampung"
              aria-label="Cari UMKM"
              value={query}
              enterKeyHint="search"
              autoComplete="off"
              onChange={(event) => changeQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  submitSearch();
                }
              }}
            />
            {query && (
              <button
                type="button"
                className="clear"
                aria-label="Hapus pencarian"
                title="Hapus pencarian"
                onClick={() => changeQuery("")}
              >
                <X className="i sm" />
              </button>
            )}
          </label>
          <div className="only-desktop">
            <SelectMenu
              value={areaToValue(area)}
              options={AREA_OPTIONS}
              onChange={changeArea}
              ariaLabel="Jarak"
              width={112}
              display={areaLabel(area)}
            />
          </div>
        </div>
        <div className="search-mobile-row">
          <SelectMenu
            value={category}
            options={CATEGORY_OPTIONS}
            onChange={changeCategory}
            ariaLabel="Kategori"
          />
          <SelectMenu
            value={areaToValue(area)}
            options={AREA_OPTIONS}
            onChange={changeArea}
            ariaLabel="Jarak"
            display={areaLabel(area)}
          />
        </div>
      </div>
      <div
        className="tg only-desktop"
        role="group"
        aria-label="Kategori"
        style={{ alignSelf: "flex-start" }}
      >
        {CATEGORY_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            className={category === value ? "on" : ""}
            aria-pressed={category === value}
            onClick={() => changeCategory(value)}
          >
            {value}
          </button>
        ))}
      </div>
      {isSearching && (
        <div className="mut" role="status" style={{ fontSize: 13 }}>
          {ranked.length === 0
            ? `Tidak ada UMKM untuk “${query.trim()}”.`
            : `${ranked.length} hasil untuk “${query.trim()}” · dari semua jarak`}
        </div>
      )}
      {locationMessage && (
        <div className="alert" role="status" style={{ padding: "8px 12px" }}>
          {locationState === "locating" ? <Loader2 className="i spin" /> : <Locate className="i" />}
          <span>{locationMessage}</span>
        </div>
      )}
    </div>
  );

  return (
    <main className="app page-h" style={{ position: "relative", overflow: "hidden" }}>
      <Rail
        items={[
          { label: "Peta", icon: "map", active: true, onClick: closeDetail },
          { label: "Daftar", icon: "list", onClick: () => setIsListOpen(true) },
          { label: "Tentang", icon: "info", onClick: () => setIsAboutOpen(true) },
        ]}
        footerItems={[{ label: "Admin", icon: "shield", href: "/admin" }]}
      />

      <div className="map-area">
        <UmkmMap
          items={mapItems}
          selectedId={selectedId}
          center={center}
          userLocation={userLocation}
          radiusKm={typeof area === "number" && !isSearching ? area : null}
          initialCamera={restored?.camera}
          fitRequest={fitRequest}
          theme={theme}
          onSelect={selectById}
          onViewportChange={handleViewportChange}
          onMovingChange={() => {}}
          onUserZoom={handleUserZoom}
          onReady={(controls) => {
            mapControlsRef.current = controls;
          }}
        />

        {searchCard}

        {!isDetailOpen && (
          <div className="map-top-actions">
            <button
              type="button"
              className="btn ic o"
              aria-label="Tentang"
              title="Tentang"
              onClick={() => setIsAboutOpen(true)}
            >
              <Info className="i" />
            </button>
            <Link className="btn ic o" href="/admin" aria-label="Admin" title="Admin">
              <ShieldCheck className="i" />
            </Link>
            <button
              type="button"
              className="btn ic o"
              aria-label="Tema"
              title="Tema"
              onClick={toggleTheme}
            >
              <ThemeIcon className="i" />
            </button>
          </div>
        )}

        <div className={`fcard map-zoom${isDetailOpen ? " left" : ""}`}>
          <button
            type="button"
            className="btn ic g"
            aria-label="Perbesar"
            style={{ borderRadius: "var(--rl) var(--rl) 0 0" }}
            onClick={() => mapControlsRef.current?.zoomIn()}
          >
            <Plus className="i" />
          </button>
          <div className="sep" />
          <button
            type="button"
            className="btn ic g"
            aria-label="Perkecil"
            style={{ borderRadius: 0 }}
            onClick={() => mapControlsRef.current?.zoomOut()}
          >
            <Minus className="i" />
          </button>
          <div className="sep" />
          <button
            type="button"
            className={`btn ic g${locationState === "off" ? "" : " active"}`}
            aria-label="Lokasi saya"
            aria-pressed={locationState === "tracking"}
            aria-busy={locationState === "locating"}
            title={
              locationState === "tracking" && !shouldFollowUser
                ? "Kembali ke lokasi saya"
                : "Lokasi saya"
            }
            style={{ borderRadius: "0 0 var(--rl) var(--rl)" }}
            onClick={handleLocateClick}
          >
            {locationState === "locating" ? (
              <Loader2 className="i spin" />
            ) : (
              <Locate
                className="i"
                style={shouldFollowUser ? { fill: "currentColor", fillOpacity: 0.2 } : undefined}
              />
            )}
          </button>
        </div>

        {detailItem ? (
          <>
            <div className="fcard map-legend">
              <Legend />
            </div>
            <aside
              className="fcard detail-panel"
              aria-label={`Detail ${displayText(detailItem.brand)}`}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 8px 0 8px",
                }}
              >
                <button type="button" className="btn g sm" onClick={closeDetail}>
                  <ArrowLeft className="i sm" />
                  Daftar
                </button>
                <button
                  type="button"
                  className="btn ic sm g"
                  aria-label="Tutup"
                  title="Tutup"
                  onClick={closeDetail}
                >
                  <X className="i sm" />
                </button>
              </div>
              <div className="scroll">
                <div style={{ padding: "8px 20px 0" }}>
                  <div className="fw6" style={{ fontSize: 20, lineHeight: "26px" }}>
                    {displayText(detailItem.brand)}
                  </div>
                  <div className="mut" style={{ marginTop: 2 }}>
                    {villageName(detailItem.address)} · {formatDistance(detailDistance)}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                    <span className="bdg sec">{detailItem.subCategory}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, padding: "16px 20px 0" }}>
                  <Link className="btn" style={{ flex: 1 }} href={`/rute/${detailItem.id}`}>
                    <Navigation className="i" />
                    Rute
                  </Link>
                  <button type="button" className="btn o" style={{ flex: 1 }} onClick={shareItem}>
                    {isCopied ? <Check className="i" /> : <Share2 className="i" />}
                    {isCopied ? "Tersalin" : "Bagikan"}
                  </button>
                  <button
                    type="button"
                    className="btn ic o"
                    aria-label="Pusatkan"
                    title="Pusatkan"
                    onClick={centerOnItem}
                  >
                    <Locate className="i" />
                  </button>
                </div>
                <div style={{ padding: "16px 20px 0" }}>
                  <PhotoGallery
                    photos={detailItem.photos ?? []}
                    title={displayText(detailItem.brand)}
                    variant="panel"
                  />
                </div>
                <div style={{ padding: "8px 20px 0" }}>
                  {formatOperatingHours(detailItem.openingHours, detailItem.closingHours) && (
                    <InfoRow icon={Clock}>
                      {formatOperatingHours(detailItem.openingHours, detailItem.closingHours)}
                    </InfoRow>
                  )}
                  {detailItem.contact && (
                    <InfoRow icon={Phone}>
                      <a href={whatsappUrl(detailItem.contact)} target="_blank" rel="noreferrer">
                        {detailItem.contact}
                      </a>
                    </InfoRow>
                  )}
                  {detailItem.socials.map((link) => (
                    <InfoRow key={`${link.platform}-${link.handle}`} icon={Globe}>
                      <a href={socialUrl(link)} target="_blank" rel="noreferrer">
                        {socialLabel(link)}
                      </a>
                    </InfoRow>
                  ))}
                  <InfoRow icon={Package}>{displayText(detailItem.products, "sentence")}</InfoRow>
                  <ProductCatalog item={detailItem} compact />
                  <InfoRow icon={MapPin}>
                    {detailItem.address
                      ? displayText(detailItem.address)
                      : "Alamat belum dicantumkan"}
                  </InfoRow>
                  <InfoRow icon={Users}>{displayText(detailItem.ownerName)}</InfoRow>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "16px 20px",
                  borderTop: "1px solid var(--bd)",
                }}
              >
                <Link className="btn o" href={`/umkm/${detailItem.id}`} style={{ flex: 1 }}>
                  <ExternalLink className="i" />
                  Buka profil
                </Link>
                <button
                  type="button"
                  className={`btn${compareIds.includes(detailItem.id) ? "" : " o"}`}
                  style={{ flex: 1 }}
                  aria-pressed={compareIds.includes(detailItem.id)}
                  onClick={() => toggleCompare(detailItem)}
                >
                  <Columns2 className="i" />
                  {compareIds.includes(detailItem.id) ? "Dipilih" : "Bandingkan"}
                </button>
              </div>
            </aside>
          </>
        ) : (
          <>
            <div className={`map-row${isCarouselHidden ? " collapsed" : ""}`}>
              <div
                className="fcard"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "6px 14px",
                  height: 40,
                }}
              >
                <span className="fw6">{ranked.length} UMKM</span>
                <Legend />
              </div>
              <div className="fcard" style={{ display: "flex" }}>
                <button
                  type="button"
                  className="btn ic g"
                  aria-label={isCarouselHidden ? "Tampilkan daftar" : "Sembunyikan daftar"}
                  aria-expanded={!isCarouselHidden}
                  title={isCarouselHidden ? "Tampilkan daftar" : "Sembunyikan daftar"}
                  onClick={() => setIsCarouselHidden((isHidden) => !isHidden)}
                >
                  {isCarouselHidden ? <ChevronUp className="i" /> : <ChevronDown className="i" />}
                </button>
                <button
                  type="button"
                  className="btn ic g"
                  aria-label="Sebelumnya"
                  title="Sebelumnya"
                  disabled={activeIndex <= 0}
                  onClick={() => stepSelection(-1)}
                >
                  <ChevronLeft className="i" />
                </button>
                <button
                  type="button"
                  className="btn ic g"
                  aria-label="Berikutnya"
                  title="Berikutnya"
                  disabled={activeIndex >= ranked.length - 1}
                  onClick={() => stepSelection(1)}
                >
                  <ChevronRight className="i" />
                </button>
              </div>
            </div>
            <div className="carousel" ref={carouselRef} hidden={isCarouselHidden}>
              {ranked.map((entry) => (
                <UmkmCard
                  key={entry.item.id}
                  entry={entry}
                  selected={entry.item.id === activeEntry?.item.id}
                  compared={compareIds.includes(entry.item.id)}
                  onSelect={(item) => focusItem(item, true)}
                  onCompare={toggleCompare}
                />
              ))}
              {ranked.length === 0 && (
                <div className="cc" style={{ width: 320 }}>
                  <div className="fw5">Tidak ada UMKM</div>
                  <div className="mut" style={{ fontSize: 13 }}>
                    Ubah kata kunci, kategori, atau jarak pencarian.
                  </div>
                  {!isSearching && area !== "all" && (
                    <div>
                      <button type="button" className="btn o sm" onClick={() => changeArea("all")}>
                        Tampilkan semua jarak
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <div className="only-mobile mobile-dock">
          <div
            style={{ display: "flex", justifyContent: "flex-start", gap: 8, alignItems: "center" }}
          >
            <span
              className="fcard fw6"
              style={{
                padding: "0 12px",
                height: 32,
                display: "inline-flex",
                alignItems: "center",
                fontSize: 13,
              }}
            >
              {activeIndex < 0 ? `${ranked.length} UMKM` : `${activeIndex + 1} / ${ranked.length}`}
            </span>
            <div className="fcard" style={{ display: "flex" }}>
              <button
                type="button"
                className="btn ic sm g"
                aria-label="Sebelumnya"
                title="Sebelumnya"
                disabled={activeIndex <= 0}
                onClick={() => stepSelection(-1)}
              >
                <ChevronLeft className="i sm" />
              </button>
              <button
                type="button"
                className="btn ic sm g"
                aria-label="Berikutnya"
                title="Berikutnya"
                disabled={activeIndex >= ranked.length - 1}
                onClick={() => stepSelection(1)}
              >
                <ChevronRight className="i sm" />
              </button>
            </div>
          </div>
          {activeEntry && (
            <UmkmCard
              entry={activeEntry}
              selected
              mobile
              compared={compareIds.includes(activeEntry.item.id)}
              onSelect={(item) => focusItem(item, false)}
              onCompare={toggleCompare}
              onClose={() => {
                setSelectedId(null);
                setIsDetailOpen(false);
              }}
            />
          )}
        </div>

        {compareItems.length > 0 && (
          <div
            className={`fcard compare-tray${detailItem ? " detail" : ""}${isCarouselHidden && !detailItem ? " low" : ""}`}
            role="region"
            aria-label="Perbandingan UMKM"
          >
            <div className="compare-slots">
              {[0, 1].map((slot) => {
                const item = compareItems[slot];
                if (!item) {
                  return (
                    <span key={slot} className="compare-chip empty">
                      Pilih satu lagi
                    </span>
                  );
                }

                return (
                  <span key={item.id} className="compare-chip">
                    <span className="ell">{displayText(item.brand)}</span>
                    <button
                      type="button"
                      aria-label={`Hapus ${displayText(item.brand)} dari perbandingan`}
                      onClick={() => toggleCompare(item)}
                    >
                      <X className="i xs" />
                    </button>
                  </span>
                );
              })}
            </div>
            {compareItems.length === 2 ? (
              <Link className="btn sm" href={compareHref(compareIds)}>
                <Columns2 className="i sm" />
                Bandingkan
              </Link>
            ) : (
              <button type="button" className="btn sm" disabled>
                <Columns2 className="i sm" />
                Bandingkan
              </button>
            )}
          </div>
        )}
      </div>

      <nav className="only-mobile mobile-nav" aria-label="Navigasi">
        <button type="button" className="on" onClick={closeDetail}>
          <MapIcon className="i" />
          Peta
        </button>
        <button type="button" onClick={() => setIsListOpen(true)}>
          <List className="i" />
          Daftar
        </button>
        <button type="button" onClick={() => setIsAboutOpen(true)}>
          <Info className="i" />
          Tentang
        </button>
        <Link href="/admin">
          <ShieldCheck className="i" />
          Admin
        </Link>
      </nav>

      {compareFirst && (
        <ComparePickerDialog
          items={initialItems}
          excludeId={compareFirst.id}
          onClose={() => setCompareFirst(null)}
          onPick={(item) => {
            const ids = [compareFirst.id, item.id];
            setCompareIds(ids);
            saveCompareIds(ids);
            setCompareFirst(null);
            router.push(compareHref(ids));
          }}
        />
      )}
      <Dialog open={isAboutOpen} onClose={() => setIsAboutOpen(false)} labelledBy="about-title">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 id="about-title">Tentang UMKM Banjarsari</h2>
          <p>Direktori geografis UMKM Desa Banjarsari, Bayongbong, Garut.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "Titik usaha per kampung",
            "Filter kategori dan produk",
            "Temukan lokasi dan rute menuju usaha",
          ].map((text) => (
            <div key={text} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Check className="i sm" style={{ marginTop: 3 }} />
              <span>{text}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12 }}>
          {mapProvider === "google"
            ? "Peta disediakan oleh Google Maps."
            : "Peta © OpenFreeMap, data © OpenStreetMap contributors."}
        </p>
        <div className="ft">
          <button type="button" className="btn o" onClick={() => setIsAboutOpen(false)}>
            Tutup
          </button>
        </div>
      </Dialog>

      <Dialog open={isListOpen} onClose={() => setIsListOpen(false)} labelledBy="list-title">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 id="list-title">Daftar UMKM</h2>
          <p>{ranked.length} usaha sesuai pencarian, diurutkan dari yang terdekat.</p>
        </div>
        <div style={{ maxHeight: "50vh", overflow: "auto", margin: "0 -8px" }}>
          {ranked.map(({ item, distance }) => (
            <button
              key={item.id}
              type="button"
              className="menu-row"
              onClick={() => {
                setIsListOpen(false);
                focusItem(item, true);
              }}
            >
              <span className="sq">
                <CategoryIcon category={item.subCategory} />
              </span>
              <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                <span className="ell fw5" style={{ display: "block" }}>
                  {displayText(item.brand)}
                </span>
                <span className="mut ell" style={{ display: "block", fontSize: 13 }}>
                  {item.subCategory} · {villageName(item.address)}
                </span>
              </span>
              <span className="dist">{formatDistance(distance)}</span>
            </button>
          ))}
        </div>
        <div className="ft">
          <button type="button" className="btn o" onClick={() => setIsListOpen(false)}>
            Tutup
          </button>
        </div>
      </Dialog>
    </main>
  );
}
