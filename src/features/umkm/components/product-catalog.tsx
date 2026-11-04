"use client";

import { Package } from "lucide-react";
import { useCallback, useState } from "react";

import { PhotoLightbox } from "@/components/photo-lightbox";
import { catalogOf, productPrice } from "@/features/umkm/catalog";
import type { Umkm } from "@/features/umkm/types";

export function ProductCatalog({ item, compact = false }: { item: Umkm; compact?: boolean }) {
  const [previewProductId, setPreviewProductId] = useState<string | null>(null);
  const closePreview = useCallback(() => setPreviewProductId(null), []);
  const products = catalogOf(item);
  const productsWithPhotos = products.filter((product) => product.photoUrl);
  const previewIndex = productsWithPhotos.findIndex((product) => product.id === previewProductId);
  if (!products.length) {
    return <p className="mut">Katalog produk belum dicantumkan.</p>;
  }

  return (
    <>
      <div className={`product-catalog${compact ? " compact" : ""}`}>
        {products.map((product) => (
          <article className="product-card" key={product.id}>
            {product.photoUrl ? (
              <button
                type="button"
                className="product-image product-image-button"
                onClick={() => setPreviewProductId(product.id)}
                aria-label={`Lihat foto produk ${product.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.photoUrl} alt={product.name} loading="lazy" />
              </button>
            ) : (
              !compact && (
                <div className="product-image">
                  <Package className="i lg" />
                </div>
              )
            )}
            <div className="product-info">
              <h3>{product.name}</h3>
              <strong className="product-price">{productPrice(product)}</strong>
              {product.description && <p className="mut">{product.description}</p>}
            </div>
          </article>
        ))}
      </div>
      {previewIndex !== -1 && (
        <PhotoLightbox
          photos={productsWithPhotos.map((product) => product.photoUrl)}
          title={productsWithPhotos[previewIndex].name}
          index={previewIndex}
          onChange={(nextIndex) => setPreviewProductId(productsWithPhotos[nextIndex].id)}
          onClose={closePreview}
        />
      )}
    </>
  );
}
