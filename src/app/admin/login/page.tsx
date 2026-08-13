import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
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
  return <main className="login-shell"><section className="login-card">
    <Link href="/" className="back-link"><ArrowLeft size={18} /> Kembali ke peta</Link>
    <span className="login-icon"><ShieldCheck size={28} /></span>
    <h1>Masuk sebagai admin</h1>
    <p>Gunakan akun yang terdaftar sebagai admin aktif.</p>
    <LoginForm />
  </section></main>;
}
