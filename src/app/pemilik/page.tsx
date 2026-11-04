import { ArrowLeft, KeyRound, Store } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { OwnerGateForm } from "@/app/pemilik/owner-gate-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { getOwnerKey } from "@/lib/auth/owner";

export const metadata = { title: "Akses pemilik usaha" };

export default async function OwnerGatePage() {
  if (await getOwnerKey()) {
    redirect("/pemilik/usaha");
  }

  return (
    <main className="app page-h" style={{ position: "relative", overflow: "auto" }}>
      <div style={{ position: "absolute", right: 16, top: 16 }}>
        <ThemeToggle />
      </div>
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 16,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 24,
              height: 24,
              borderRadius: "var(--r)",
              background: "var(--pri)",
              color: "var(--prf)",
            }}
          >
            <Store className="i sm" />
          </span>
          UMKM Banjarsari
        </Link>
        <div
          className="card"
          style={{
            width: 420,
            maxWidth: "100%",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <span
            className="sq"
            style={{ width: 40, height: 40, background: "var(--pri)", color: "var(--prf)" }}
          >
            <KeyRound className="i lg" />
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, lineHeight: "24px", fontWeight: 600 }}>
              Akses pemilik usaha
            </h1>
            <p className="mut" style={{ margin: "4px 0 0", lineHeight: "20px" }}>
              Masukkan kunci akses dari admin desa untuk mengisi atau mengubah data usaha Anda.
            </p>
          </div>
          <OwnerGateForm />
          <Link href="/admin/login" className="btn o">
            <ArrowLeft className="i" />
            Kembali ke login
          </Link>
        </div>
        <span className="mut">
          Belum punya kunci? Hubungi admin desa.{" "}
          <Link href="/" style={{ textDecoration: "underline", textUnderlineOffset: 4 }}>
            Kembali ke peta
          </Link>
        </span>
      </div>
    </main>
  );
}
