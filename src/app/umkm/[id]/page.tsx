import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Columns2,
  Globe,
  MapPin,
  Navigation,
  Package,
  Phone,
  ChevronRight,
} from "lucide-react";
import { Rail } from "@/components/rail";
import { ThemeToggle } from "@/components/theme-toggle";
import { getUmkm } from "@/data/umkm-repository";
import { PhotoGallery } from "@/features/umkm/components/photo-gallery";
import { LocationMap } from "@/features/umkm/components/location-map";
import { ShareButton } from "@/features/umkm/components/share-button";
import {
  directionsUrl,
  displayText,
  externalUrl,
  formatCoordinates,
  formatOperatingHours,
  villageName,
  whatsappUrl,
} from "@/features/umkm/format";

export async function generateMetadata({ params }: PageProps<"/umkm/[id]">) {
  const item = await getUmkm((await params).id);
  return { title: item ? displayText(item.brand) : "UMKM tidak ditemukan" };
}

function InfoItem({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="irow">
      <Icon className="i" />
      <div style={{ minWidth: 0 }}>
        <div className="mut" style={{ fontSize: 13 }}>{label}</div>
        <div className="fw5" style={{ marginTop: 2 }}>{children}</div>
      </div>
    </div>
  );
}

export default async function UmkmDetailPage({ params }: PageProps<"/umkm/[id]">) {
  const { id } = await params;
  const item = await getUmkm(id);
  if (!item) notFound();

  const brand = displayText(item.brand);
  const village = villageName(item.address);
  const owner = displayText(item.ownerName);
  const hours = formatOperatingHours(item.openingHours, item.closingHours);
  const sharePath = `/umkm/${item.id}`;
  const shareText = `${brand} · ${displayText(item.products, "sentence")} (Banjarsari, Garut)`;

  return (
    <div className="app page-min-h" style={{ position: "relative" }}>
      <Rail
        items={[
          { label: "Peta", icon: "map", href: "/", active: true },
          { label: "Daftar", icon: "list", href: "/" },
          { label: "Tentang", icon: "info", href: "/" },
        ]}
        footerItems={[{ label: "Admin", icon: "shield", href: "/admin" }]}
      />

      <div className="app-body page-min-h" style={{ marginLeft: 56 }}>
        <div className="top only-desktop">
          <span className="fw5">Profil UMKM</span>
        </div>
        <div className="top only-mobile" style={{ padding: "0 8px", gap: 4 }}>
          <Link className="btn ic g" href="/" aria-label="Kembali" title="Kembali"><ArrowLeft className="i" /></Link>
          <span className="fw5 ell" style={{ flex: 1 }}>{brand}</span>
          <ShareButton title={brand} text={shareText} path={sharePath} className="btn ic g" iconOnly />
          <ThemeToggle />
        </div>

        <div className="pf-wrap">
          <div className="mut only-desktop" style={{ gap: 8, alignItems: "center" }}>
            <Link href="/">Peta</Link>
            <ChevronRight className="i sm" />
            <span style={{ color: "var(--fg)" }}>{brand}</span>
          </div>

          <div className="pf-head">
            <div style={{ flex: 1, minWidth: 280 }}>
              <h1 className="pf-title">{brand}</h1>
              <div className="pf-badges">
                <span className="bdg sec">{item.subCategory}</span>
                <span className="mut pf-sub">{village} · {owner}</span>
              </div>
            </div>
            <div className="pf-actions">
              <a className="btn" href={directionsUrl(item)} target="_blank" rel="noreferrer"><Navigation className="i" />Rute</a>
              <Link className="btn o" href={`/bandingkan?a=${item.id}`}><Columns2 className="i" />Bandingkan</Link>
              <ShareButton title={brand} text={shareText} path={sharePath} />
            </div>
          </div>

          <div className="pf-cols">
            <div className="pf-main">
              <div className="pf-gallery">
                <PhotoGallery photos={item.photos ?? []} title={brand} variant="profile" />
              </div>
              <div className="card pf-card pf-products">
                <div className="fw6" style={{ fontSize: 16, lineHeight: "16px" }}>Produk</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, border: "1px solid var(--bd)", borderRadius: "var(--r)" }}>
                  <Package className="i" />
                  <span>{displayText(item.products, "sentence") || "Produk belum dicantumkan"}</span>
                </div>
              </div>
            </div>
            <div className="pf-side">
              <div className="card pf-card pf-location">
                <div className="fw6" style={{ fontSize: 16, lineHeight: "16px" }}>Lokasi</div>
                <LocationMap item={item} />
                <div style={{ display: "flex", gap: 10 }}>
                  <MapPin className="i" />
                  <span>{item.address ? displayText(item.address) : "Alamat belum dicantumkan"}</span>
                </div>
              </div>
              <div className="card pf-card pf-info">
                <div className="fw6" style={{ fontSize: 16, lineHeight: "16px", marginBottom: 8 }}>Informasi</div>
                {hours && <InfoItem icon={Clock} label="Jam buka">{hours}</InfoItem>}
                {item.contact && (
                  <InfoItem icon={Phone} label="WhatsApp">
                    <a href={whatsappUrl(item.contact)} target="_blank" rel="noreferrer">{item.contact}</a>
                  </InfoItem>
                )}
                {item.website && (
                  <InfoItem icon={Globe} label="Media sosial">
                    <a href={externalUrl(item.website)} target="_blank" rel="noreferrer">{item.website.replace(/^https?:\/\//, "")}</a>
                  </InfoItem>
                )}
                <InfoItem icon={MapPin} label="Koordinat"><span className="mono">{formatCoordinates(item.latitude, item.longitude)}</span></InfoItem>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
