import Link from "next/link";
import { PasswordPage } from "@/features/admin/components/password-page";
import { PasswordForm } from "@/features/admin/components/password-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getRecoveryAdmin } from "@/lib/auth/password-recovery";
export const metadata = { title: "Kata sandi baru", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function ResetPasswordPage() {
  const admin = isSupabaseConfigured() ? await getRecoveryAdmin(await createSupabaseServerClient()) : null;
  return <PasswordPage title="Buat kata sandi baru" description={admin ? "Tautan pemulihan berhasil diverifikasi. Masukkan kata sandi baru Anda." : "Tautan pemulihan tidak valid, sudah digunakan, atau kedaluwarsa."}>{admin ? <PasswordForm reset /> : <><div className="alert alert-err" role="alert">Minta tautan baru dan buka pada browser yang sama dengan permintaan pemulihan.</div><Link className="btn" href="/admin/lupa-password">Minta tautan baru</Link><Link className="btn o" href="/admin/login">Kembali ke login</Link></>}</PasswordPage>;
}
