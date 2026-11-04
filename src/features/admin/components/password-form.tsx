"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordResetAction, resetPasswordAction } from "@/app/admin/password-actions";

export function PasswordForm({ reset = false }: { reset?: boolean }) {
  const [state, action, isPending] = useActionState(
    reset ? resetPasswordAction : requestPasswordResetAction,
    { success: false, message: "" },
  );

  let submitLabel = "Kirim tautan pemulihan";
  if (reset) {
    submitLabel = "Simpan kata sandi baru";
  } else if (state.success) {
    submitLabel = "Permintaan diterima";
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {reset ? (
        <>
          <label className="fl">
            <span className="lbl">Kata sandi baru</span>
            <span className="inp">
              <input
                aria-label="Kata sandi baru"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                disabled={isPending}
              />
            </span>
            <small className="mut">Minimal 8 karakter.</small>
          </label>
          <label className="fl">
            <span className="lbl">Konfirmasi kata sandi baru</span>
            <span className="inp">
              <input
                aria-label="Konfirmasi kata sandi baru"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                disabled={isPending}
              />
            </span>
          </label>
        </>
      ) : (
        <label className="fl">
          <span className="lbl">Email akun</span>
          <span className="inp">
            <input
              aria-label="Email pemulihan"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@email.com"
              required
              disabled={isPending}
            />
          </span>
        </label>
      )}
      {state.message && (
        <div
          className={`alert${state.success ? "" : " alert-err"}`}
          role={state.success ? "status" : "alert"}
        >
          {state.message}
        </div>
      )}
      <button className="btn" type="submit" disabled={isPending || (!reset && state.success)}>
        {isPending && <Loader2 className="i spin" />}
        {submitLabel}
      </button>
      <Link href="/admin/login" className="btn o">
        Kembali ke login
      </Link>
    </form>
  );
}
