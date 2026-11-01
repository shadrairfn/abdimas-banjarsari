"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Eye, EyeOff, Loader2, Lock, LogIn, Mail } from "lucide-react";
import { signInAction } from "@/app/admin/actions";

const initialState = { success: false, message: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="login-portal-form">
      <div className="login-field-group">
        <label className="login-field-label">
          <span className="field-title">Email</span>
          <div className="login-input-box">
            <Mail size={16} className="login-input-icon" />
            <input
              name="email"
              type="email"
              required
              placeholder="admin@banjarsari.desa.id"
              autoComplete="email"
              disabled={pending}
            />
          </div>
        </label>

        <label className="login-field-label">
          <div className="label-row">
            <span className="field-title">Kata Sandi</span>
          </div>
          <div className="login-input-box">
            <Lock size={16} className="login-input-icon" />
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={pending}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>
      </div>

      {state.message && (
        <div className="login-alert error" role="alert">
          <span>{state.message}</span>
        </div>
      )}

      <button type="submit" className="login-submit-btn" disabled={pending}>
        {pending ? (
          <>
            <Loader2 size={16} className="spin-icon" />
            <span>Memverifikasi akses…</span>
          </>
        ) : (
          <>
            <LogIn size={16} />
            <span>Masuk ke Dashboard</span>
          </>
        )}
      </button>
    </form>
  );
}
