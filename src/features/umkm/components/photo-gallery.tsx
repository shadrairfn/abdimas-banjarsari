"use client";

import { ImageIcon } from "lucide-react";
import { useCallback, useState } from "react";

import { PhotoLightbox } from "@/components/photo-lightbox";

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
            <PhotoTile
              key={index}
              photo={photo}
              title={title}
              index={index}
              className="ph"
              style={{ height: 80 }}
              onOpen={setOpenIndex}
            />
          ))}
        </div>
      ) : (
        <div className="pg">
          {tiles.map((photo, index) => (
            <PhotoTile
              key={index}
              photo={photo}
              title={title}
              index={index}
              className={`ph pg-tile${index === 0 ? " pg-main" : ""}`}
              style={{}}
              onOpen={setOpenIndex}
            />
          ))}
        </div>
      )}
      {openIndex !== null && (
        <PhotoLightbox
          photos={photos}
          title={title}
          index={openIndex}
          onChange={setOpenIndex}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}
