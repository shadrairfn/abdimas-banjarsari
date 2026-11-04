"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { createAdminAction } from "@/app/admin/actions";
import { Dialog } from "@/components/dialog";
import type { ActionState } from "@/lib/http/run-action";

const initialState: ActionState = { success: false, message: "" };
const ADMIN_DIALOG_CLOSE_DELAY_MS = 800;

export function AddAdminDialog({ onClose }: { onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(createAdminAction, initialState);
  const [mode, setMode] = useState<"google" | "password">("google");
  const [shouldShowFeedback, setShouldShowFeedback] = useState(true);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const timer = setTimeout(onClose, ADMIN_DIALOG_CLOSE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [onClose, state]);

  return (
    <Dialog open onClose={onClose} labelledBy="add-admin-title">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 id="add-admin-title">Tambah admin</h2>
        <p>
          {mode === "google"
            ? "Izinkan akun Google menjadi admin dengan memasukkan emailnya."
            : "Buat akun admin dengan nama, email, dan kata sandi."}
        </p>
      </div>
      <div className="tg" role="group" aria-label="Metode login admin baru">
        <button
          type="button"
          disabled={isPending}
          aria-pressed={mode === "google"}
          className={mode === "google" ? "on" : ""}
          onClick={() => {
            setMode("google");
            setShouldShowFeedback(false);
          }}
        >
          Login Google
        </button>
        <button
          type="button"
          disabled={isPending}
          aria-pressed={mode === "password"}
          className={mode === "password" ? "on" : ""}
          onClick={() => {
            setMode("password");
            setShouldShowFeedback(false);
          }}
        >
          Email dan kata sandi
        </button>
      </div>
      <form
        action={formAction}
        onSubmit={() => setShouldShowFeedback(true)}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <input type="hidden" name="mode" value={mode} />
        <label className="fl">
          <span className="lbl">Peran</span>
          <span className="inp">
            <select name="role" aria-label="Peran akun baru" defaultValue="admin">
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </span>
        </label>
        {mode === "password" && (
          <div className="fl">
            <label className="lbl" htmlFor="admin-name">
              Nama
            </label>
            <label className="inp">
              <input
                id="admin-name"
                name="fullName"
                placeholder="Nama lengkap"
                required
                minLength={2}
                maxLength={120}
                autoComplete="off"
              />
            </label>
          </div>
        )}
        <div className="fl">
          <label className="lbl" htmlFor="admin-email">
            Email
          </label>
          <label className="inp">
            <input
              id="admin-email"
              name="email"
              type="email"
              placeholder="nama@banjarsari.desa.id"
              required
              autoComplete="off"
            />
          </label>
        </div>
        {mode === "password" && (
          <div className="fl">
            <label className="lbl" htmlFor="admin-password">
              Kata sandi
            </label>
            <label className="inp">
              <input
                id="admin-password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
          </div>
        )}
        {mode === "google" && (
          <p className="mut">
            Email ini mendapat izin login Google sesuai peran yang dipilih. Tidak perlu membuat atau
            memasukkan kata sandi.
          </p>
        )}
        {shouldShowFeedback && state.message && (
          <div
            className={`alert${state.success ? "" : " alert-err"}`}
            role={state.success ? "status" : "alert"}
          >
            <span style={{ color: state.success ? "var(--fg)" : "var(--des)" }}>
              {state.message}
            </span>
          </div>
        )}
        <div className="ft">
          <button type="button" className="btn o" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="btn" disabled={isPending}>
            {isPending && <Loader2 className="i spin" />}
            {mode === "google" ? "Izinkan email Google" : "Simpan admin"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
