import type { CatalogProduct, Umkm } from "./types";

/** Give a catalog entry a stable ID before editing fields or uploading its photo. */
export function createCatalogProduct(): CatalogProduct {
  return {
    id: crypto.randomUUID(),
    name: "",
    price: null,
    priceLabel: "",
    unit: "",
    description: "",
    photoUrl: "",
  };
}

/** Read a catalog while preserving legacy price descriptions when no catalog field exists. */
export function catalogOf(
  item: Pick<Umkm, "id" | "brand" | "products" | "priceDescription" | "catalog" | "photos">,
): CatalogProduct[] {
  if (Array.isArray(item.catalog)) {
    return item.catalog;
  }

  if (!item.priceDescription) {
    return [];
  }

  return [
    {
      id: item.id,
      name: (item.products || item.brand).slice(0, 120),
      price: null,
      priceLabel: item.priceDescription,
      unit: "",
      description: "",
      photoUrl: item.photos?.[0] || "",
    },
  ];
}
/** Format a product's numeric or descriptive price with its optional unit. */
export function productPrice(product: CatalogProduct) {
  const amount =
    product.price !== null && Number.isFinite(product.price)
      ? new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(product.price)
      : product.priceLabel || "Hubungi penjual";

  return `${amount}${product.unit ? ` / ${product.unit}` : ""}`;
}
/** Build a readable catalog snapshot for export and before/after audit entries. */
export function catalogText(products: CatalogProduct[]) {
  return products
    .map(
      (product) =>
        `${product.name}: ${productPrice(product)}${product.description ? ` · ${product.description}` : ""}${product.photoUrl ? ` · Foto: ${product.photoUrl}` : ""}`,
    )
    .join("\n");
}
