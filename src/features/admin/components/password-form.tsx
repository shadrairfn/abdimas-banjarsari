"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { requestPasswordResetAction, resetPasswordAction } from "@/app/admin/password-actions";

export function PasswordForm({ reset = false }: { reset?: boolean }) {
  const [state, action, pending] = useActionState(reset ? resetPasswordAction : requestPasswordResetAction, { success: false, message: "" });
  return <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    {reset ? <>
      <label className="fl"><span className="lbl">Kata sandi baru</span><span className="inp"><input aria-label="Kata sandi baru" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={pending} /></span><small className="mut">Minimal 8 karakter.</small></label>
      <label className="fl"><span className="lbl">Konfirmasi kata sandi baru</span><span className="inp"><input aria-label="Konfirmasi kata sandi baru" name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={pending} /></span></label>
    </> : <label className="fl"><span className="lbl">Email akun</span><span className="inp"><input aria-label="Email pemulihan" name="email" type="email" autoComplete="email" placeholder="nama@email.com" required disabled={pending} /></span></label>}
    {state.message && <div className={`alert${state.success ? "" : " alert-err"}`} role={state.success ? "status" : "alert"}>{state.message}</div>}
    <button className="btn" type="submit" disabled={pending || (!reset && state.success)}>{pending && <Loader2 className="i spin" />}{reset ? "Simpan kata sandi baru" : state.success ? "Permintaan diterima" : "Kirim tautan pemulihan"}</button>
    <Link href="/admin/login" className="btn o">Kembali ke login</Link>
  </form>;
}
