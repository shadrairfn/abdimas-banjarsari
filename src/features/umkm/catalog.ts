import type { CatalogProduct, Umkm } from "./types";

export function catalogOf(item: Pick<Umkm, "id" | "brand" | "products" | "priceDescription" | "catalog" | "photos">): CatalogProduct[] {
  if (Array.isArray(item.catalog)) return item.catalog;
  if (!item.priceDescription) return [];
  return [{ id: item.id, name: (item.products || item.brand).slice(0, 120), price: null, priceLabel: item.priceDescription, unit: "", description: "", photoUrl: item.photos?.[0] || "" }];
}
export function productPrice(product: CatalogProduct) {
  const amount = product.price !== null && Number.isFinite(product.price)
    ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(product.price)
    : product.priceLabel || "Hubungi penjual";
  return `${amount}${product.unit ? ` / ${product.unit}` : ""}`;
}
export function catalogText(products: CatalogProduct[]) {
  return products.map(product => `${product.name}: ${productPrice(product)}${product.description ? ` · ${product.description}` : ""}${product.photoUrl ? ` · Foto: ${product.photoUrl}` : ""}`).join("\n");
}
