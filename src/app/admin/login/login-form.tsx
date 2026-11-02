"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { signInAction } from "@/app/admin/actions";
import type { ActionState } from "@/lib/http/run-action";

const initialState: ActionState = { success: false, message: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, initialState);

  return (
    <form action={action} style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="fl">
        <label className="lbl" htmlFor="login-email">Email</label>
        <label className="inp">
          <input
            id="login-email"
            name="email"
            type="email"
            required
            placeholder="admin@banjarsari.desa.id"
            autoComplete="email"
            disabled={pending}
          />
        </label>
      </div>
      <div className="fl">
        <label className="lbl" htmlFor="login-password">Kata sandi</label>
        <label className="inp">
          <input
            id="login-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            disabled={pending}
          />
        </label>
      </div>
      {state.message && (
        <div className="alert alert-err" role="alert">
          <span style={{ color: "var(--des)" }}>{state.message}</span>
        </div>
      )}
      <button type="submit" className="btn" style={{ width: "100%" }} disabled={pending}>
        {pending && <Loader2 className="i spin" />}
        Masuk
      </button>
    </form>
  );
}
