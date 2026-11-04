import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "./workspace.css";
import { listCategories } from "@/data/category-repository";
import { CategoryProvider } from "@/features/categories/category-provider";
import { NavigationMemory } from "@/components/navigation-memory";

const geist = Geist({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist-mono" });

// Runs before the first paint so a saved dark theme does not flash white.
const THEME_SCRIPT = `try{var t=localStorage.getItem("app_theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark");document.documentElement.dataset.railExpanded=String(localStorage.getItem("rail_expanded_v2")!=="false")}catch(e){}`;

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const categories = await listCategories();
  return (
    <html lang="id" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body><CategoryProvider initialCategories={categories}><NavigationMemory />{children}</CategoryProvider></body>
    </html>
  );
}
