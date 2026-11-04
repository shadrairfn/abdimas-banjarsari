import Link from "next/link";
import { Store } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ReactNode } from "react";
export function PasswordPage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="app page-min-h" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 16px 32px", gap: 24 }}>
    <div style={{ position: "absolute", top: 16, right: 16 }}><ThemeToggle /></div>
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}><Store className="i" />Peta UMKM</Link>
    <section className="card" style={{ width: 420, maxWidth: "100%", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}><div><h1 style={{ fontSize: 22, lineHeight: "28px" }}>{title}</h1><p className="mut" style={{ margin: "8px 0 0" }}>{description}</p></div>{children}</section>
  </main>;
}
