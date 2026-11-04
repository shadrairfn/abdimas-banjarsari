import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, KeyRound, LogOut, Store } from "lucide-react";
import { ownerSignOutAction } from "@/app/pemilik/actions";
import { OwnerUmkmForm } from "@/app/pemilik/usaha/owner-umkm-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { getUmkmForOwner } from "@/data/umkm-repository";
import { maskedKey } from "@/features/owner/types";
import { displayText, villageName } from "@/features/umkm/format";
import { getOwnerKey } from "@/lib/auth/owner";

export const metadata = { title: "Data usaha saya" };

export default async function OwnerBusinessPage() {
  const key = await getOwnerKey();
  if (!key) redirect("/pemilik");

  const item = key.umkm_id ? await getUmkmForOwner(key.umkm_id) : undefined;

  return (
    <main className="app page-min-h">
      <header className="top owner-top">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
          <span style={{ display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: "var(--r)", background: "var(--pri)", color: "var(--prf)" }}>
            <Store className="i sm" />
          </span>
          Peta UMKM
        </Link>
        <span className="mut only-desktop">Portal pemilik usaha</span>
        <span style={{ flex: 1 }} />
        <span className="key-chip mono"><KeyRound className="i xs" />{maskedKey(key.key_hint)}</span>
        <form action={ownerSignOutAction}>
          <button type="submit" className="btn o sm"><LogOut className="i sm" />Keluar</button>
        </form>
        <ThemeToggle />
      </header>

      <div className="owner-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, lineHeight: "32px", fontWeight: 600, letterSpacing: "-.02em" }}>{item ? "Ubah data usaha" : "Isi data usaha"}</h1>
            <p className="mut" style={{ margin: "4px 0 0" }}>
              {item ? `${displayText(item.brand)} · ${villageName(item.address)}` : "Lengkapi informasi usaha Anda agar tampil di Peta UMKM Banjarsari."}
            </p>
          </div>
          {!item && (
            <span className="bdg ok" style={{ color: "var(--wnf)", background: "color-mix(in srgb, var(--wnf) 14%, transparent)" }}><Clock className="i xs" />UMKM baru · menunggu diisi</span>
          )}
        </div>
        <OwnerUmkmForm item={item ?? null} />
      </div>
    </main>
  );
}
