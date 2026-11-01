"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, X } from "lucide-react";

interface PhotoGalleryProps {
  photos: string[];
  title: string;
}

export function PhotoGallery({ photos, title }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const isOpen = lightboxIndex !== null;
  const count = photos.length;

  const handlePrev = useCallback(() => {
    setLightboxIndex((curr) => {
      if (curr === null) return null;
      return (curr - 1 + count) % count;
    });
  }, [count]);

  const handleNext = useCallback(() => {
    setLightboxIndex((curr) => {
      if (curr === null) return null;
      return (curr + 1) % count;
    });
  }, [count]);

  const handleClose = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleClose, handlePrev, handleNext]);

  // Touch swipe support for mobile
  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 45) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    setTouchStartX(null);
  }

  if (!photos || photos.length === 0) return null;

  return (
    <>
      <div className="detail-photos-section">
        <div className="detail-photos-header">
          <ImageIcon size={14} />
          <span>Galeri Foto ({photos.length})</span>
          <small className="gallery-click-hint">Klik foto untuk memperbesar</small>
        </div>
        <div className="detail-photos-grid">
          {photos.map((photoUrl, idx) => (
            <button
              key={idx}
              type="button"
              className="detail-photo-thumb"
              onClick={() => setLightboxIndex(idx)}
              title={`Perbesar foto ${idx + 1} dari ${photos.length}`}
              aria-label={`Buka foto ${idx + 1}`}
            >
              <img src={photoUrl} alt={`${title} foto ${idx + 1}`} loading="lazy" />
              <span className="photo-thumb-zoom-badge">{idx + 1}</span>
            </button>
          ))}
        </div>
      </div>

      {isOpen && (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Galeri foto ${title}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="lightbox-container" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <header className="lightbox-topbar">
              <div className="lightbox-caption">
                <strong>{title}</strong>
                <span>Foto {lightboxIndex + 1} dari {count}</span>
              </div>
              <button
                type="button"
                className="lightbox-close-btn"
                onClick={handleClose}
                aria-label="Tutup foto"
                title="Tutup (Esc)"
              >
                <X size={20} />
              </button>
            </header>

            <div className="lightbox-viewport">
              {count > 1 && (
                <button
                  type="button"
                  className="lightbox-nav-btn prev"
                  onClick={handlePrev}
                  aria-label="Foto sebelumnya"
                  title="Sebelumnya (Panah kiri)"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              <div className="lightbox-image-wrapper">
                <img
                  key={lightboxIndex}
                  src={photos[lightboxIndex]}
                  alt={`${title} - foto ${lightboxIndex + 1}`}
                  className="lightbox-current-image"
                />
              </div>

              {count > 1 && (
                <button
                  type="button"
                  className="lightbox-nav-btn next"
                  onClick={handleNext}
                  aria-label="Foto berikutnya"
                  title="Berikutnya (Panah kanan)"
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>

            {count > 1 && (
              <div className="lightbox-thumbnails-row">
                {photos.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`lightbox-strip-thumb ${idx === lightboxIndex ? "active" : ""}`}
                    onClick={() => setLightboxIndex(idx)}
                    aria-label={`Pilih foto ${idx + 1}`}
                  >
                    <img src={url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
