"use client";

import { ArrowRight, CircleAlert, KeyRound, Loader2 } from "lucide-react";
import { useActionState } from "react";

import { ownerSignInAction } from "@/app/pemilik/actions";
import type { ActionState } from "@/lib/http/run-action";

const initialState: ActionState = { success: false, message: "" };

/** The key field of the owner gate. A wrong key shows the message of the server in red. */
export function OwnerGateForm() {
  const [state, action, isPending] = useActionState(ownerSignInAction, initialState);
  const hasError = Boolean(state.message) && !state.success;

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="fl">
        <label className="lbl" htmlFor="owner-key">
          Kunci akses
        </label>
        <label
          className="inp key-input"
          style={{ height: 44, borderColor: hasError ? "var(--des)" : undefined }}
        >
          <KeyRound className="i" style={{ color: hasError ? "var(--des)" : undefined }} />
          <input
            id="owner-key"
            name="key"
            className="mono"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="BNJ-XXXX-XXXX"
            aria-invalid={hasError}
            disabled={isPending}
            style={{ fontSize: 16, letterSpacing: ".06em" }}
          />
          {hasError && <CircleAlert className="i" style={{ color: "var(--des)" }} />}
        </label>
        {!hasError && (
          <span className="mut" style={{ fontSize: 12, marginTop: 6 }}>
            Contoh format: BNJ-XXXX-XXXX
          </span>
        )}
      </div>
      {hasError && (
        <div className="alert alert-err" role="alert">
          <CircleAlert className="i" style={{ color: "var(--des)" }} />
          <div>
            <b style={{ color: "var(--des)" }}>Kunci tidak dapat dipakai</b>
            <span>
              {state.message} Periksa kembali penulisannya, atau minta kunci baru kepada admin desa.
            </span>
          </div>
        </div>
      )}
      <button type="submit" className="btn" style={{ width: "100%" }} disabled={isPending}>
        {isPending ? <Loader2 className="i spin" /> : <ArrowRight className="i" />}Buka data usaha
      </button>
    </form>
  );
}
