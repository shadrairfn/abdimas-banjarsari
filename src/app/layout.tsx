import type { Metadata } from "next";
import { headers } from "next/headers";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;
  return {
    title: { default: "Peta UMKM Banjarsari", template: "%s · Peta UMKM Banjarsari" },
    description: "Jelajahi usaha dan produk lokal Desa Banjarsari, Bayongbong, Garut.",
    openGraph: {
      title: "Peta UMKM Banjarsari",
      description: "Temukan usaha dan produk lokal di sekitar Anda.",
      type: "website",
      locale: "id_ID",
      images: [{ url: imageUrl, width: 1732, height: 909, alt: "Peta UMKM Banjarsari" }],
    },
    twitter: { card: "summary_large_image", title: "Peta UMKM Banjarsari", description: "Temukan usaha dan produk lokal di sekitar Anda.", images: [imageUrl] },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="id"><body>{children}</body></html>;
}
