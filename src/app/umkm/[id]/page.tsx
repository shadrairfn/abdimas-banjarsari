import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleAlert, MapPin, Store } from "lucide-react";
import { CategoryIcon, CATEGORY_CONFIG } from "@/features/umkm/categories";
import { getUmkm } from "@/data/umkm-repository";

export default async function UmkmDetailPage({ params }: PageProps<"/umkm/[id]">) {
  const { id } = await params;
  const item = await getUmkm(id);
  if (!item) notFound();
  return (
    <main className="detail-shell"><div className="detail-page">
      <Link href="/" className="back-link"><ArrowLeft size={18} /> Kembali ke peta</Link>
      <article className="detail-card">
        <div className="detail-hero"><span style={{ color: CATEGORY_CONFIG[item.subCategory].color }}><CategoryIcon category={item.subCategory} size={92} /></span><div><small>UMKM Kuliner Banjarsari</small><strong>{item.subCategory}</strong></div></div>
        <div className="detail-body"><div className="detail-kicker"><Store size={16} /> Profil usaha</div><h1>{item.brand}</h1><p className="detail-owner">Dikelola oleh {item.ownerName}</p><section><h2>Produk</h2><p>{item.products}</p></section><section><h2>Alamat</h2><p className="detail-address"><MapPin size={17} /> {item.address}</p></section><div className="detail-warning"><CircleAlert size={18} /><p><strong>Lokasi belum diverifikasi</strong>Titik di peta masih berupa estimasi berdasarkan kampung/alamat sumber dan tidak boleh digunakan sebagai navigasi presisi.</p></div><Link href={`/?selected=${item.id}`} className="primary-button">Lihat pada peta</Link></div>
      </article>
    </div></main>
  );
}
