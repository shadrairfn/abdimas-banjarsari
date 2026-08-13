"use client";

import { useActionState } from "react";
import { signInAction } from "@/app/admin/actions";

const initialState = { success: false, message: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, initialState);
  return <form action={action} className="login-form">
    <label>Email admin<input name="email" type="email" required autoComplete="email" /></label>
    <label>Kata sandi<input name="password" type="password" required autoComplete="current-password" /></label>
    {state.message && <p className="form-message error">{state.message}</p>}
    <button className="primary-button" disabled={pending}>{pending ? "Masuk…" : "Masuk"}</button>
  </form>;
}
