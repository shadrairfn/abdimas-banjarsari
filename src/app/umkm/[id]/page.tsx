import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CircleAlert,
  Clock,
  ExternalLink,
  Globe,
  ImageIcon,
  MapPin,
  PackageOpen,
  Phone,
  Store,
} from "lucide-react";
import { CategoryIcon, CATEGORY_CONFIG } from "@/features/umkm/categories";
import { PhotoGallery } from "@/features/umkm/components/photo-gallery";
import { getUmkm } from "@/data/umkm-repository";

export default async function UmkmDetailPage({ params }: PageProps<"/umkm/[id]">) {
  const { id } = await params;
  const item = await getUmkm(id);
  if (!item) notFound();
  const isVerified = item.locationStatus === "verified";

  const openTrim = (item.openingHours || "").trim();
  const closeTrim = (item.closingHours || "").trim();
  const is24Hours = Boolean(openTrim && closeTrim && openTrim === closeTrim);
  const operatingHoursText = is24Hours
    ? "Buka 24 Jam"
    : openTrim || closeTrim
    ? `Buka: ${openTrim || "00:00"} - ${closeTrim || "24:00"} WIB`
    : null;

  return (
    <main className="detail-shell"><div className="detail-page">
      <Link href="/" className="back-link"><ArrowLeft size={18} /> Kembali ke peta</Link>
      <article className="detail-card">
        <div className="detail-hero">
          <div className="detail-hero-top"><span>UMKM Banjarsari</span><span>{item.category}</span></div>
          <span className="detail-category-icon" style={{ color: CATEGORY_CONFIG[item.subCategory].color }}><CategoryIcon category={item.subCategory} size={92} /></span>
          <div className="detail-hero-caption"><small>Kategori usaha</small><strong>{item.subCategory}</strong></div>
        </div>
        <div className="detail-body">
          <div className="detail-kicker"><Store size={15} /> Profil usaha</div>
          <div className="detail-title-row"><div><h1>{item.brand}</h1><p className="detail-owner">Dikelola oleh {item.ownerName}</p></div>{isVerified && <span className="detail-verified"><BadgeCheck size={15} /> Terverifikasi</span>}</div>

          {item.photos && item.photos.length > 0 && (
            <PhotoGallery photos={item.photos} title={item.brand} />
          )}

          <div className="detail-primary-info">
            {operatingHoursText && (
              <section>
                <h2><Clock size={15} /> Jam Operasional</h2>
                <p><strong style={{ color: is24Hours ? "#059669" : "inherit" }}>{operatingHoursText}</strong></p>
              </section>
            )}
            {item.contact && (
              <section>
                <h2><Phone size={15} /> Kontak / WhatsApp</h2>
                <p>
                  <a href={`https://wa.me/${item.contact.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="detail-contact-link">
                    {item.contact} <ExternalLink size={12} />
                  </a>
                </p>
              </section>
            )}
            {item.website && (
              <section>
                <h2><Globe size={15} /> Website / Media Sosial</h2>
                <p>
                  <a href={item.website.startsWith("http") ? item.website : `https://${item.website}`} target="_blank" rel="noreferrer" className="detail-contact-link">
                    {item.website.replace(/^https?:\/\//, "")} <ExternalLink size={12} />
                  </a>
                </p>
              </section>
            )}
            <section><h2><PackageOpen size={15} /> Produk unggulan</h2><p>{item.products}</p></section>
            <section><h2><MapPin size={15} /> Lokasi usaha</h2><p className={`detail-address${item.address ? "" : " empty"}`}>{item.address || "Alamat belum dicantumkan"}</p></section>
          </div>
          {!isVerified && <div className="detail-warning"><CircleAlert size={17} /><p><strong>Lokasi masih perkiraan</strong>Gunakan peta sebagai petunjuk area, bukan navigasi presisi.</p></div>}
          <div className="detail-actions"><Link href={`/?selected=${item.id}`} className="primary-button">Lihat lokasi di peta <ArrowUpRight size={15} /></Link><span>Data usaha lokal Banjarsari</span></div>
        </div>
      </article>
    </div></main>
  );
}
