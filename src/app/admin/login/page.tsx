import Link from "next/link";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import { LoginForm } from "@/app/admin/login/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { getActiveAdmin } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Masuk admin" };

export default async function AdminLoginPage() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (await getActiveAdmin(supabase)) redirect("/admin");
  }

  return (
    <main className="app page-h" style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: 16, top: 16 }}>
        <ThemeToggle />
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 16 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
          <span style={{ display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: "var(--r)", background: "var(--pri)", color: "var(--prf)" }}>
            <Store className="i sm" />
          </span>
          Peta UMKM
        </Link>
        <div className="card" style={{ width: 384, maxWidth: "100%", padding: "24px 0", display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ padding: "0 24px" }}>
            <div className="fw6" style={{ fontSize: 16, lineHeight: "16px" }}>Masuk</div>
            <div className="mut" style={{ marginTop: 8 }}>Dashboard admin Peta UMKM</div>
          </div>
          <LoginForm />
        </div>
        <Link className="mut" href="/" style={{ textDecoration: "underline", textUnderlineOffset: 4 }}>Kembali ke peta</Link>
      </div>
    </main>
  );
}
