"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, X } from "lucide-react";

type GalleryVariant = "panel" | "profile";

interface PhotoGalleryProps {
  photos: string[];
  title: string;
  variant: GalleryVariant;
}

const SLOT_COUNT: Record<GalleryVariant, number> = { panel: 3, profile: 5 };

function PhotoTile({
  photo,
  title,
  index,
  className,
  style,
  onOpen,
}: {
  photo?: string;
  title: string;
  index: number;
  className: string;
  style: React.CSSProperties;
  onOpen: (index: number) => void;
}) {
  if (!photo) {
    return (
      <div className={className} style={style} aria-hidden="true">
        <ImageIcon className="i lg" />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={{ ...style, cursor: "zoom-in" }}
      onClick={() => onOpen(index)}
      aria-label={`Lihat foto ${index + 1} ${title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo} alt={`${title}, foto ${index + 1}`} loading="lazy" />
    </button>
  );
}

function Lightbox({
  photos,
  title,
  index,
  onChange,
  onClose,
}: {
  photos: string[];
  title: string;
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
}) {
  const move = useCallback(
    (step: number) => onChange((index + step + photos.length) % photos.length),
    [index, onChange, photos.length],
  );

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [move, onClose]);

  return (
    <div
      className="dlg-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${title}`}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12, alignItems: "center", maxWidth: "min(960px, 100%)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[index]}
          alt={`${title}, foto ${index + 1}`}
          style={{ maxWidth: "100%", maxHeight: "78vh", borderRadius: "var(--rl)", objectFit: "contain", background: "var(--card)" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {photos.length > 1 && (
            <button type="button" className="btn ic o" onClick={() => move(-1)} aria-label="Foto sebelumnya">
              <ChevronLeft className="i" />
            </button>
          )}
          <span className="fcard fw6" style={{ padding: "0 12px", height: 36, display: "inline-flex", alignItems: "center", fontSize: 13 }}>
            {index + 1} / {photos.length}
          </span>
          {photos.length > 1 && (
            <button type="button" className="btn ic o" onClick={() => move(1)} aria-label="Foto berikutnya">
              <ChevronRight className="i" />
            </button>
          )}
          <button type="button" className="btn ic o" onClick={onClose} aria-label="Tutup foto">
            <X className="i" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Photo grid of the panel (3 tiles) and the profile page (1 large + 4 tiles) with a lightbox. */
export function PhotoGallery({ photos, title, variant }: PhotoGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const tiles = Array.from({ length: SLOT_COUNT[variant] }, (_, index) => photos[index]);
  const closeLightbox = useCallback(() => setOpenIndex(null), []);

  return (
    <>
      {variant === "panel" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
          {tiles.map((photo, index) => (
            <PhotoTile key={index} photo={photo} title={title} index={index} className="ph" style={{ height: 80 }} onOpen={setOpenIndex} />
          ))}
        </div>
      ) : (
        <div className="pg">
          {tiles.map((photo, index) => (
            <PhotoTile key={index} photo={photo} title={title} index={index} className={`ph pg-tile${index === 0 ? " pg-main" : ""}`} style={{}} onOpen={setOpenIndex} />
          ))}
        </div>
      )}
      {openIndex !== null && (
        <Lightbox photos={photos} title={title} index={openIndex} onChange={setOpenIndex} onClose={closeLightbox} />
      )}
    </>
  );
}
