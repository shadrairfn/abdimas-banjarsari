import Link from "next/link";
import { ArrowLeft, CheckCircle2, Database, MapPin, ShieldCheck, Store } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/admin/login/login-form";
import { getActiveAdmin } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminLoginPage() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (await getActiveAdmin(supabase)) redirect("/admin");
  }

  return (
    <main className="login-portal-shell">
      <div className="login-portal-grid">
        {/* Left Column: 2D UMKM Illustration Showcase */}
        <div className="login-portal-image-col">
          <img
            src="/umkm-illustration.jpg"
            alt="Ilustrasi Usaha UMKM Lokal Desa Banjarsari"
            className="login-cover-image"
          />
          <div className="login-image-gradient-overlay" />

          <Link href="/" className="login-floating-back" title="Kembali ke peta publik">
            <ArrowLeft size={15} />
            <span>Kembali ke Peta Publik</span>
          </Link>
        </div>

        {/* Right Form Column */}
        <div className="login-portal-main">
          <div className="login-card-container">
            <div className="login-card-header">
              <h1>Selamat Datang</h1>
              <p>Masukkan kredensial akun administrator Anda untuk masuk ke sistem.</p>
            </div>

            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
