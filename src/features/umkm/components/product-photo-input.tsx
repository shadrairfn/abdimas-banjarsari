"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";

import { PhotoLightbox } from "@/components/photo-lightbox";
import { PHOTO_ACCEPT } from "@/features/umkm/photo-rules";
import { uploadPhotos } from "@/features/umkm/photo-upload";

interface ProductPhotoInputProps {
  productNumber: number;
  photoUrl: string;
  businessPhotos: string[];
  uploadEndpoint: string;
  onPhotoChange: (photoUrl: string) => void;
  onUploadingChange: (isUploading: boolean) => void;
}

export function ProductPhotoInput({
  productNumber,
  photoUrl,
  businessPhotos,
  uploadEndpoint,
  onPhotoChange,
  onUploadingChange,
}: ProductPhotoInputProps) {
  const inputId = useId();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const isUploadInProgress = useRef(false);

  async function uploadProductPhoto(files: File[]) {
    if (isUploadInProgress.current || files.length === 0) {
      return;
    }

    if (files.length !== 1) {
      setUploadError("Pilih satu foto untuk setiap produk.");

      return;
    }

    isUploadInProgress.current = true;
    setIsUploading(true);
    setUploadError("");
    onUploadingChange(true);

    try {
      const [uploadedPhotoUrl] = await uploadPhotos({
        endpoint: uploadEndpoint,
        files,
      });

      onPhotoChange(uploadedPhotoUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Foto produk gagal diunggah.";

      setUploadError(message);
    } finally {
      isUploadInProgress.current = false;
      setIsUploading(false);
      onUploadingChange(false);
    }
  }

  function removeProductPhoto() {
    onPhotoChange("");
    setUploadError("");
  }

  return (
    <div className="product-photo-field">
      <span className="lbl">Foto produk</span>
      <div
        className={`product-photo-drop${isDragging ? " dragging" : ""}`}
        aria-busy={isUploading}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void uploadProductPhoto(Array.from(event.dataTransfer.files));
        }}
      >
        <div className="product-photo-preview">
          {photoUrl ? (
            <button
              type="button"
              className="product-photo-preview-button"
              disabled={isUploading}
              aria-label={`Lihat foto produk ${productNumber}`}
              onClick={() => setIsPreviewOpen(true)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt={`Foto produk ${productNumber}`} />
            </button>
          ) : (
            <label htmlFor={inputId} className="product-photo-placeholder">
              <ImagePlus className="i lg" />
            </label>
          )}
          {isUploading && (
            <span className="product-photo-progress">
              <Loader2 className="i spin" />
              Mengunggah…
            </span>
          )}
        </div>
        <label htmlFor={inputId} className="product-photo-pick">
          {photoUrl ? "Ganti foto" : "Pilih foto"}
        </label>
        <small className="mut">atau seret satu foto ke sini</small>
        <input
          id={inputId}
          type="file"
          className="sr-only"
          aria-label={`Unggah foto produk ${productNumber}`}
          accept={PHOTO_ACCEPT}
          disabled={isUploading}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void uploadProductPhoto(files);
          }}
        />
      </div>
      {isPreviewOpen && photoUrl && (
        <PhotoLightbox
          photos={[photoUrl]}
          title={`Produk ${productNumber}`}
          index={0}
          onChange={() => {}}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
      <small className="mut">JPG, PNG, WEBP, GIF · maks. 5MB</small>
      {uploadError && (
        <p className="field-err" role="alert">
          {uploadError}
        </p>
      )}
      {photoUrl && (
        <button
          type="button"
          className="btn o sm"
          disabled={isUploading}
          onClick={removeProductPhoto}
          aria-label={`Hapus foto produk ${productNumber}`}
        >
          <Trash2 className="i sm" />
          Hapus foto
        </button>
      )}
      {businessPhotos.length > 0 && (
        <label className="fl">
          <span className="lbl">Pilih dari foto usaha</span>
          <span className="inp">
            <select
              aria-label={`Foto usaha untuk produk ${productNumber}`}
              value={businessPhotos.includes(photoUrl) ? photoUrl : ""}
              disabled={isUploading}
              onChange={(event) => {
                if (event.target.value) {
                  onPhotoChange(event.target.value);
                }
              }}
            >
              <option value="">Pilih foto usaha</option>
              {businessPhotos.map((businessPhoto, index) => (
                <option key={businessPhoto} value={businessPhoto}>
                  Foto usaha {index + 1}
                </option>
              ))}
            </select>
          </span>
        </label>
      )}
    </div>
  );
}
