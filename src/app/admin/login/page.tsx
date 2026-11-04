import { KeyRound, Store } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/admin/login/login-form";
import { GoogleIcon } from "@/components/google-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { getActiveAdmin } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Masuk admin" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  const messages: Record<string, string> = {
    google_not_allowed:
      "Login Google akun ini belum diizinkan oleh Superadmin atau akun sedang nonaktif. Hubungi Superadmin untuk mendapatkan akses.",
    google_unavailable:
      "Login Google belum tersedia. Silakan gunakan email dan kata sandi atau hubungi pengelola.",
    google_failed: "Login Google tidak berhasil. Silakan coba lagi.",
    admin_required:
      "Akun Google ini belum terdaftar sebagai admin aktif. Hubungi pengelola untuk mendapatkan akses.",
  };
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (await getActiveAdmin(supabase)) {
      redirect("/admin");
    }
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
          gap: 24,
          padding: "56px 16px 24px",
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
            width: 384,
            maxWidth: "100%",
            padding: "24px 0",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div style={{ padding: "0 24px" }}>
            <div className="fw6" style={{ fontSize: 16, lineHeight: "16px" }}>
              Masuk
            </div>
            <div className="mut" style={{ marginTop: 8 }}>
              Dashboard Admin UMKM Banjarsari
            </div>
          </div>
          {notice === "password_reset" && (
            <div className="alert" role="status" style={{ margin: "0 24px" }}>
              Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru.
            </div>
          )}
          <LoginForm />
          {error && messages[error] && (
            <div className="alert alert-err" role="alert" style={{ margin: "0 24px" }}>
              {messages[error]}
            </div>
          )}
          <div style={{ padding: "0 24px" }}>
            <Link
              className="btn o"
              id="google-login"
              href="/auth/google"
              prefetch={false}
              style={{ width: "100%" }}
            >
              <GoogleIcon />
              Masuk dengan Google
            </Link>
          </div>
          <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ borderTop: "1px solid var(--bd)" }} />
            <Link className="btn o owner-access-link" href="/pemilik" style={{ width: "100%" }}>
              <KeyRound className="i" />
              Punya kunci akses? Masuk sebagai pemilik
            </Link>
          </div>
        </div>
        <Link
          className="mut"
          href="/"
          style={{ textDecoration: "underline", textUnderlineOffset: 4 }}
        >
          Kembali ke peta
        </Link>
      </div>
    </main>
  );
}
