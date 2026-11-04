"use client";

import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  Columns2,
  ExternalLink,
  Navigation,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import { Rail } from "@/components/rail";
import { ThemeToggle } from "@/components/theme-toggle";
import { catalogOf, catalogText } from "@/features/umkm/catalog";
import { CategoryIcon } from "@/features/umkm/categories";
import { compareHref, saveCompareIds } from "@/features/umkm/compare";
import { LocationMap } from "@/features/umkm/components/location-map";
import { PhotoGallery } from "@/features/umkm/components/photo-gallery";
import {
  displayText,
  formatCoordinates,
  formatDistance,
  formatOperatingHours,
  socialLabel,
  socialPlatformLabel,
  socialsText,
  socialUrl,
  villageName,
  whatsappUrl,
} from "@/features/umkm/format";
import type { Umkm } from "@/features/umkm/types";
import { distanceKm } from "@/lib/geo";

import { ComparePickerDialog } from "./compare-picker-dialog";
import { ProductCatalog } from "./product-catalog";

interface CompareViewProps {
  items: Umkm[];
  firstId?: string;
  secondId?: string;
}

interface CompareRow {
  label: string;
  render: (item: Umkm) => ReactNode;
  // Plain text used to decide whether the two values differ. Rows without it are never highlighted.
  text?: (item: Umkm) => string;
}

const EMPTY_VALUE = "—";

function Empty() {
  return <span className="mut">{EMPTY_VALUE}</span>;
}

function textOrEmpty(value: string) {
  return value.trim() ? value : <Empty />;
}

const ROWS: CompareRow[] = [
  {
    label: "Katalog & harga",
    render: (item) => <ProductCatalog item={item} compact />,
    text: (item) => catalogText(catalogOf(item)),
  },
  {
    label: "Produk unggulan",
    render: (item) => textOrEmpty(item.featuredProduct ?? ""),
    text: (item) => item.featuredProduct ?? "",
  },
  {
    label: "Foto",
    render: (item) => (
      <PhotoGallery photos={item.photos ?? []} title={displayText(item.brand)} variant="panel" />
    ),
  },
  { label: "Kategori", render: (item) => item.subCategory, text: (item) => item.subCategory },
  {
    label: "Produk",
    render: (item) => textOrEmpty(displayText(item.products, "sentence")),
    text: (item) => displayText(item.products, "sentence"),
  },
  {
    label: "Jam buka",
    render: (item) => formatOperatingHours(item.openingHours, item.closingHours) ?? <Empty />,
    text: (item) => formatOperatingHours(item.openingHours, item.closingHours) ?? "",
  },
  {
    label: "WhatsApp",
    render: (item) =>
      item.contact ? (
        <a href={whatsappUrl(item.contact)} target="_blank" rel="noreferrer">
          {item.contact}
        </a>
      ) : (
        <Empty />
      ),
    text: (item) => item.contact ?? "",
  },
  {
    label: "Media sosial",
    render: (item) =>
      item.socials.length > 0 ? (
        item.socials.map((link) => (
          <div key={`${link.platform}-${link.handle}`}>
            <a href={socialUrl(link)} target="_blank" rel="noreferrer">
              {socialLabel(link)}
            </a>
            <span className="mut"> · {socialPlatformLabel(link)}</span>
          </div>
        ))
      ) : (
        <Empty />
      ),
    text: (item) => socialsText(item.socials),
  },
  {
    label: "Alamat",
    render: (item) => (
      <>
        <div>{item.address ? displayText(item.address) : "Alamat belum dicantumkan"}</div>
        <div className="mut" style={{ fontSize: 13, marginTop: 2 }}>
          {villageName(item.address)}
        </div>
      </>
    ),
    text: (item) => item.address,
  },
  { label: "Lokasi", render: (item) => <LocationMap item={item} /> },
  {
    label: "Koordinat",
    render: (item) => (
      <span className="mono">{formatCoordinates(item.latitude, item.longitude)}</span>
    ),
  },
];

function SlotHeader({
  item,
  onPick,
  onClear,
}: {
  item: Umkm | undefined;
  onPick: () => void;
  onClear: () => void;
}) {
  if (!item) {
    return (
      <div className="cmp-head">
        <div className="cmp-slot-empty">
          <span>Pilih UMKM untuk dibandingkan</span>
          <button type="button" className="btn" onClick={onPick}>
            <Plus className="i" />
            Pilih UMKM
          </button>
        </div>
      </div>
    );
  }

  const brand = displayText(item.brand);

  return (
    <div className="cmp-head">
      <div
        className="card"
        style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span className="sq cmp-sq">
            <CategoryIcon category={item.subCategory} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2
              className="fw6"
              style={{ margin: 0, fontSize: 18, lineHeight: "24px", overflowWrap: "anywhere" }}
            >
              {brand}
            </h2>
            <div className="mut" style={{ fontSize: 13 }}>
              {item.subCategory} · {villageName(item.address)}
            </div>
          </div>
          <button
            type="button"
            className="btn ic sm g"
            aria-label={`Hapus ${brand} dari perbandingan`}
            title="Hapus"
            onClick={onClear}
          >
            <X className="i sm" />
          </button>
        </div>
        <div className="cmp-actions">
          <Link className="btn o sm" href={`/umkm/${item.id}`}>
            <ExternalLink className="i sm" />
            Profil
          </Link>
          <Link className="btn sm" href={`/rute/${item.id}`}>
            <Navigation className="i sm" />
            Rute
          </Link>
          <button type="button" className="btn g sm cmp-swap" onClick={onPick}>
            <RefreshCw className="i sm" />
            Ganti
          </button>
        </div>
      </div>
    </div>
  );
}

/** Two UMKM profiles side by side, row by row, with the differences highlighted. */
export function CompareView({ items, firstId, secondId }: CompareViewProps) {
  const router = useRouter();
  const [pickerSlot, setPickerSlot] = useState<0 | 1 | null>(firstId && !secondId ? 1 : null);
  const [shouldShowOnlyDifferences, setShouldShowOnlyDifferences] = useState(false);

  const first = items.find((item) => item.id === firstId);
  const second = items.find((item) => item.id === secondId && item.id !== first?.id);
  const slots = [first, second];
  const chosenIds = slots.flatMap((item) => (item ? [item.id] : []));
  const chosenKey = chosenIds.join(",");

  // Lets the map show the same two choices in its compare tray when the visitor goes back.
  useEffect(() => {
    saveCompareIds(chosenKey ? chosenKey.split(",") : []);
  }, [chosenKey]);

  function go(next: (Umkm | undefined)[]) {
    router.replace(compareHref(next.flatMap((item) => (item ? [item.id] : []))), { scroll: false });
  }

  function pick(item: Umkm) {
    if (pickerSlot === null) {
      return;
    }

    const next = [...slots];
    next[pickerSlot] = item;
    setPickerSlot(null);
    go(next);
  }

  function clear(slot: 0 | 1) {
    const next = [...slots];
    next[slot] = undefined;
    go(next);
  }

  const hasBothSelections = Boolean(first && second);
  const visibleRows = ROWS.filter((row) => {
    if (!shouldShowOnlyDifferences || !row.text || !first || !second) {
      return true;
    }

    return row.text(first) !== row.text(second);
  });

  return (
    <div className="app page-min-h" style={{ position: "relative" }}>
      <Rail
        items={[
          { label: "Peta", icon: "map", href: "/" },
          { label: "Bandingkan", icon: "compare", href: "/bandingkan", active: true },
        ]}
        footerItems={[{ label: "Admin", icon: "shield", href: "/admin" }]}
      />

      <div className="app-body page-min-h" style={{ marginLeft: 56 }}>
        <div className="top only-desktop">
          <span className="fw5">Bandingkan UMKM</span>
        </div>
        <div className="top only-mobile" style={{ padding: "0 8px", gap: 4 }}>
          <Link className="btn ic g" href="/" aria-label="Kembali ke peta" title="Kembali ke peta">
            <ArrowLeft className="i" />
          </Link>
          <span className="fw5 ell" style={{ flex: 1 }}>
            Bandingkan UMKM
          </span>
          <ThemeToggle />
        </div>

        <div className="cmp-wrap">
          <div className="cmp-bar">
            <Link className="btn o sm" href="/">
              <ArrowLeft className="i sm" />
              Kembali ke peta
            </Link>
            <span style={{ flex: 1 }} />
            <label className="chk">
              <input
                type="checkbox"
                checked={shouldShowOnlyDifferences}
                disabled={!hasBothSelections}
                onChange={(event) => setShouldShowOnlyDifferences(event.target.checked)}
              />
              <span className={`cb${shouldShowOnlyDifferences ? " on" : ""}`}>
                {shouldShowOnlyDifferences && <Check className="i xs" />}
              </span>
              Hanya perbedaan
            </label>
            <button
              type="button"
              className="btn o sm"
              disabled={!hasBothSelections}
              onClick={() => go([second, first])}
            >
              <ArrowLeftRight className="i sm" />
              Tukar posisi
            </button>
          </div>

          {first && second && (
            <div className="alert" role="status">
              <Navigation className="i" />
              <span>Jarak antara kedua usaha: {formatDistance(distanceKm(first, second))}</span>
            </div>
          )}

          {!hasBothSelections && (
            <div className="alert compare-guide" role="status">
              <Columns2 className="i" />
              <div>
                <b>{first ? "Langkah 2: pilih usaha kedua" : "Langkah 1: pilih usaha pertama"}</b>
                <span>
                  {first
                    ? `${displayText(first.brand)} sudah dipilih. Pilih usaha lain untuk melihat perbandingan.`
                    : "Pilih dua usaha untuk membandingkan produk, harga, dan lokasi."}
                </span>
              </div>
              <button className="btn sm" onClick={() => setPickerSlot(first ? 1 : 0)}>
                Pilih usaha
              </button>
            </div>
          )}
          <div className="cmp-grid">
            <div className="only-desktop" />
            <SlotHeader item={first} onPick={() => setPickerSlot(0)} onClear={() => clear(0)} />
            <SlotHeader item={second} onPick={() => setPickerSlot(1)} onClear={() => clear(1)} />

            {visibleRows.map((row) => {
              const isDifferent = Boolean(
                row.text && first && second && row.text(first) !== row.text(second),
              );

              return (
                <div
                  key={row.label}
                  className={`cmp-row${isDifferent ? " cmp-row-different" : ""}`}
                >
                  <div className="cmp-label">{row.label}</div>
                  {slots.map((item, index) => (
                    <div key={item?.id ?? `empty-${index}`} className="cmp-cell">
                      {item ? row.render(item) : <Empty />}
                    </div>
                  ))}
                </div>
              );
            })}
            {shouldShowOnlyDifferences &&
              visibleRows.length === ROWS.filter((row) => !row.text).length && (
                <p className="mut" style={{ gridColumn: "1 / -1", padding: "16px 0" }}>
                  Kedua usaha memiliki data yang sama.
                </p>
              )}
          </div>
        </div>
      </div>

      {pickerSlot !== null && (
        <ComparePickerDialog
          items={items}
          excludeId={slots[pickerSlot === 0 ? 1 : 0]?.id}
          onPick={pick}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </div>
  );
}
