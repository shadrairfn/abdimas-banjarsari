"use client";

import { Plus, Trash2 } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";

import { createCatalogProduct } from "@/features/umkm/catalog";
import { MAX_CATALOG_PRODUCTS } from "@/features/umkm/constants";
import type { CatalogProduct } from "@/features/umkm/types";

import { ProductFields } from "./product-fields";
import { ProductPhotoInput } from "./product-photo-input";

interface CatalogEditorProps {
  products: CatalogProduct[];
  photos: string[];
  uploadEndpoint: string;
  onChange: Dispatch<SetStateAction<CatalogProduct[]>>;
  onUploadingChange: (isUploading: boolean) => void;
}

export function CatalogEditor({
  products,
  photos,
  uploadEndpoint,
  onChange,
  onUploadingChange,
}: CatalogEditorProps) {
  const [uploadingProductIds, setUploadingProductIds] = useState(new Set<string>());
  const uploadingProductIdsRef = useRef(new Set<string>());
  const hasReachedProductLimit = products.length >= MAX_CATALOG_PRODUCTS;

  useEffect(() => {
    return () => onUploadingChange(false);
  }, [onUploadingChange]);

  function updateProduct(productId: string, changes: Partial<CatalogProduct>) {
    // An upload can finish after other fields change; apply it against the latest state by ID.
    onChange((currentProducts) =>
      currentProducts.map((product) => {
        if (product.id === productId) {
          return { ...product, ...changes };
        }

        return product;
      }),
    );
  }

  function removeProduct(productId: string) {
    onChange((currentProducts) => currentProducts.filter((product) => product.id !== productId));
  }

  function addProduct() {
    onChange((currentProducts) => {
      if (currentProducts.length >= MAX_CATALOG_PRODUCTS) {
        return currentProducts;
      }

      return [...currentProducts, createCatalogProduct()];
    });
  }

  function changeUploadStatus(productId: string, isUploading: boolean) {
    const nextUploadingIds = new Set(uploadingProductIdsRef.current);
    if (isUploading) {
      nextUploadingIds.add(productId);
    } else {
      nextUploadingIds.delete(productId);
    }

    uploadingProductIdsRef.current = nextUploadingIds;
    setUploadingProductIds(nextUploadingIds);
    onUploadingChange(nextUploadingIds.size > 0);
  }

  return (
    <section className="catalog-editor span-2" aria-label="Katalog produk">
      <div className="catalog-editor-heading">
        <div>
          <h3>Katalog produk</h3>
          <p className="mut">Setiap kartu berisi foto, harga, dan informasi satu produk.</p>
        </div>
        <span className="bdg sec">
          {products.length}/{MAX_CATALOG_PRODUCTS} produk
        </span>
      </div>
      {products.length === 0 && (
        <div className="catalog-empty">
          <p>Belum ada produk dalam katalog.</p>
          <p className="mut">Tambahkan produk pertama untuk mengisi foto dan harganya.</p>
        </div>
      )}
      <div className="catalog-product-list">
        {products.map((product, index) => {
          const productNumber = index + 1;
          const isUploadingPhoto = uploadingProductIds.has(product.id);

          return (
            <section
              className="catalog-edit-card"
              key={product.id}
              aria-label={`Produk ${productNumber}`}
            >
              <header className="catalog-edit-top">
                <div className="catalog-product-heading">
                  <span className="catalog-product-number">{productNumber}</span>
                  <div>
                    <h4>Produk {productNumber}</h4>
                    <span className="mut">{product.name || "Produk baru"}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn o sm"
                  aria-label={`Hapus produk ${productNumber}`}
                  disabled={isUploadingPhoto}
                  onClick={() => removeProduct(product.id)}
                >
                  <Trash2 className="i sm" />
                  Hapus produk
                </button>
              </header>
              <div className="catalog-edit-body">
                <ProductPhotoInput
                  productNumber={productNumber}
                  photoUrl={product.photoUrl}
                  businessPhotos={photos}
                  uploadEndpoint={uploadEndpoint}
                  onPhotoChange={(photoUrl) => updateProduct(product.id, { photoUrl })}
                  onUploadingChange={(isUploading) => changeUploadStatus(product.id, isUploading)}
                />
                <ProductFields
                  product={product}
                  productNumber={productNumber}
                  onChange={(changes) => updateProduct(product.id, changes)}
                />
              </div>
            </section>
          );
        })}
      </div>
      <button
        type="button"
        className="btn o catalog-add-product"
        disabled={hasReachedProductLimit}
        onClick={addProduct}
      >
        <Plus className="i" />
        Tambah produk
      </button>
    </section>
  );
}
