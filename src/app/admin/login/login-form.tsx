"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { signInAction } from "@/app/admin/actions";
import type { ActionState } from "@/lib/http/run-action";

const initialState: ActionState = { success: false, message: "" };

export function LoginForm() {
  const [state, action, isPending] = useActionState(signInAction, initialState);

  return (
    <form
      action={action}
      style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div className="fl">
        <label className="lbl" htmlFor="login-email">
          Email
        </label>
        <label className="inp">
          <input
            id="login-email"
            name="email"
            type="email"
            required
            placeholder="admin@banjarsari.desa.id"
            autoComplete="email"
            disabled={isPending}
          />
        </label>
      </div>
      <div className="fl">
        <label className="lbl" htmlFor="login-password">
          Kata sandi
        </label>
        <label className="inp">
          <input
            id="login-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            disabled={isPending}
          />
        </label>
      </div>
      <Link
        href="/admin/lupa-password"
        style={{ alignSelf: "flex-end", textDecoration: "underline", textUnderlineOffset: 4 }}
      >
        Lupa kata sandi?
      </Link>
      {state.message && (
        <div className="alert alert-err" role="alert">
          <span style={{ color: "var(--des)" }}>{state.message}</span>
        </div>
      )}
      <button type="submit" className="btn" style={{ width: "100%" }} disabled={isPending}>
        {isPending && <Loader2 className="i spin" />}
        Masuk
      </button>
    </form>
  );
}
