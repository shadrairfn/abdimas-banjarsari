import { Package } from "lucide-react";
import { catalogOf, productPrice } from "@/features/umkm/catalog";
import type { Umkm } from "@/features/umkm/types";

export function ProductCatalog({ item, compact = false }: { item: Umkm; compact?: boolean }) {
  const products = catalogOf(item);
  if (!products.length) return <p className="mut">Katalog produk belum dicantumkan.</p>;
  return <div className={`product-catalog${compact ? " compact" : ""}`}>{products.map(product => <article className="product-card" key={product.id}>
    {!compact && <div className="product-image">{product.photoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={product.photoUrl} alt={product.name} loading="lazy" />
    ) : <Package className="i lg" />}</div>}
    <div className="product-info"><h3>{product.name}</h3><strong className="product-price">{productPrice(product)}</strong>{product.description && <p className="mut">{product.description}</p>}</div>
  </article>)}</div>;
}
