"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect } from "react";

import { Dialog } from "@/components/dialog";

interface PhotoLightboxProps {
  photos: string[];
  title: string;
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
}

/** Share the same full-size, keyboard-accessible preview across business and product photos. */
export function PhotoLightbox({ photos, title, index, onChange, onClose }: PhotoLightboxProps) {
  const activeIndex = Math.max(0, Math.min(index, photos.length - 1));
  const hasMultiplePhotos = photos.length > 1;
  const movePhoto = useCallback(
    (step: number) => {
      if (photos.length > 1) {
        onChange((activeIndex + step + photos.length) % photos.length);
      }
    },
    [activeIndex, onChange, photos.length],
  );

  useEffect(() => {
    function handleArrowKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        movePhoto(-1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        movePhoto(1);
      }
    }

    window.addEventListener("keydown", handleArrowKey);

    return () => window.removeEventListener("keydown", handleArrowKey);
  }, [movePhoto]);

  if (photos.length === 0) {
    return null;
  }

  return (
    <Dialog
      open
      hideClose
      onClose={onClose}
      width={960}
      className="photo-lightbox"
      overlayClassName="photo-lightbox-overlay"
      ariaLabel={`Foto ${title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="photo-lightbox-image"
        src={photos[activeIndex]}
        alt={`${title}, foto ${activeIndex + 1}`}
      />
      <div className="photo-lightbox-controls">
        <span className="photo-lightbox-title">{title}</span>
        {hasMultiplePhotos && (
          <button
            type="button"
            className="btn ic o"
            onClick={() => movePhoto(-1)}
            aria-label="Foto sebelumnya"
          >
            <ChevronLeft className="i" />
          </button>
        )}
        <span className="photo-lightbox-count" aria-live="polite">
          {activeIndex + 1} / {photos.length}
        </span>
        {hasMultiplePhotos && (
          <button
            type="button"
            className="btn ic o"
            onClick={() => movePhoto(1)}
            aria-label="Foto berikutnya"
          >
            <ChevronRight className="i" />
          </button>
        )}
        <button type="button" className="btn ic o" onClick={onClose} aria-label="Tutup foto">
          <X className="i" />
        </button>
      </div>
    </Dialog>
  );
}
