"use client";

import { MAX_PRODUCT_NAME_LENGTH, MAX_PRODUCT_PRICE } from "@/features/umkm/constants";
import type { CatalogProduct } from "@/features/umkm/types";

interface ProductFieldsProps {
  product: CatalogProduct;
  productNumber: number;
  onChange: (changes: Partial<CatalogProduct>) => void;
}

export function ProductFields({ product, productNumber, onChange }: ProductFieldsProps) {
  function changeProductPrice(value: string) {
    if (value === "") {
      onChange({ price: null });

      return;
    }

    onChange({ price: Number(value), priceLabel: "" });
  }

  return (
    <div className="catalog-edit-fields">
      <label className="fl">
        <span className="lbl">
          Nama produk <span className="mut">(wajib)</span>
        </span>
        <span className="inp">
          <input
            aria-label={`Nama produk ${productNumber}`}
            value={product.name}
            required
            maxLength={MAX_PRODUCT_NAME_LENGTH}
            placeholder="Contoh: Kopi susu gula aren"
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </span>
      </label>
      <div className="catalog-edit-pricing">
        <label className="fl">
          <span className="lbl">Harga (Rp)</span>
          <span className="inp">
            <input
              type="number"
              aria-label={`Harga produk ${productNumber}`}
              min={0}
              max={MAX_PRODUCT_PRICE}
              step={1}
              value={product.price ?? ""}
              placeholder="Contoh: 15000"
              onChange={(event) => changeProductPrice(event.target.value)}
            />
          </span>
        </label>
        <label className="fl">
          <span className="lbl">Satuan</span>
          <span className="inp">
            <input
              aria-label={`Satuan produk ${productNumber}`}
              value={product.unit}
              maxLength={40}
              placeholder="porsi / bungkus / gelas"
              onChange={(event) => onChange({ unit: event.target.value })}
            />
          </span>
        </label>
      </div>
      {product.price === null && (
        <label className="fl">
          <span className="lbl">Keterangan harga</span>
          <span className="inp">
            <input
              aria-label={`Keterangan harga produk ${productNumber}`}
              value={product.priceLabel}
              maxLength={500}
              placeholder="Misalnya: mulai Rp10.000 atau hubungi penjual"
              onChange={(event) => onChange({ priceLabel: event.target.value })}
            />
          </span>
        </label>
      )}
      <label className="fl">
        <span className="lbl">Keterangan produk</span>
        <span className="inp ta">
          <textarea
            aria-label={`Keterangan produk ${productNumber}`}
            value={product.description}
            maxLength={500}
            placeholder="Ukuran, varian, atau informasi lain tentang produk"
            onChange={(event) => onChange({ description: event.target.value })}
          />
        </span>
      </label>
    </div>
  );
}
