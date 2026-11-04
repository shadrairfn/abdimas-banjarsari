"use client";
import { Plus, Trash2 } from "lucide-react";
import type { CatalogProduct } from "@/features/umkm/types";

export function CatalogEditor({ products, photos, onChange }: { products: CatalogProduct[]; photos: string[]; onChange: (products: CatalogProduct[]) => void }) {
  function change(index: number, patch: Partial<CatalogProduct>) { onChange(products.map((product, position) => position === index ? { ...product, ...patch } : product)); }
  return <section className="catalog-editor span-2" aria-label="Katalog produk">
    <div className="catalog-editor-heading"><div><h3>Katalog produk</h3><p className="mut">Tambahkan harga dan informasi untuk setiap produk.</p></div><span className="bdg sec">{products.length}/50 produk</span></div>
    {products.map((product, index) => <div className="catalog-edit-card" key={product.id}>
      <div className="catalog-edit-top"><strong>Produk {index + 1}</strong><button type="button" className="btn ic g sm" aria-label={`Hapus produk ${index + 1}`} onClick={() => onChange(products.filter((_, position) => position !== index))}><Trash2 className="i sm" /></button></div>
      <label className="fl"><span className="lbl">Nama produk</span><span className="inp"><input aria-label={`Nama produk ${index + 1}`} value={product.name} required maxLength={120} onChange={event => change(index, { name: event.target.value })} /></span></label>
      <div className="catalog-edit-pricing"><label className="fl"><span className="lbl">Harga (Rp)</span><span className="inp"><input type="number" aria-label={`Harga produk ${index + 1}`} min={0} max={1000000000000} step={1} value={product.price ?? ""} placeholder="Contoh: 15000" onChange={event => change(index, { price: event.target.value === "" ? null : Number(event.target.value), ...(event.target.value !== "" ? { priceLabel: "" } : {}) })} /></span></label>
      <label className="fl"><span className="lbl">Satuan</span><span className="inp"><input aria-label={`Satuan produk ${index + 1}`} value={product.unit} maxLength={40} placeholder="porsi / bungkus / gelas" onChange={event => change(index, { unit: event.target.value })} /></span></label></div>
      {product.price === null && <label className="fl"><span className="lbl">Keterangan harga</span><span className="inp"><input aria-label={`Keterangan harga produk ${index + 1}`} value={product.priceLabel} maxLength={500} placeholder="Misalnya: mulai Rp10.000, atau hubungi penjual" onChange={event => change(index, { priceLabel: event.target.value })} /></span></label>}
      <label className="fl"><span className="lbl">Keterangan produk</span><span className="inp"><input aria-label={`Keterangan produk ${index + 1}`} value={product.description} maxLength={500} onChange={event => change(index, { description: event.target.value })} /></span></label>
      <label className="fl"><span className="lbl">Foto produk</span><span className="inp"><select aria-label={`Foto produk ${index + 1}`} value={product.photoUrl} onChange={event => change(index, { photoUrl: event.target.value })}><option value="">Tanpa foto</option>{[...new Set([...photos, ...(product.photoUrl ? [product.photoUrl] : [])])].map((url, position) => <option value={url} key={url}>Foto {position + 1}</option>)}</select></span></label>
    </div>)}
    <button type="button" className="btn o" disabled={products.length >= 50} onClick={() => onChange([...products, { id: crypto.randomUUID(), name: "", price: null, priceLabel: "", unit: "", description: "", photoUrl: "" }])}><Plus className="i" />Tambah produk</button>
    <p className="mut">Unggah foto usaha di bawah untuk memilihnya sebagai foto produk.</p>
  </section>;
}
