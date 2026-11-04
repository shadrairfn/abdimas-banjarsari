"use server";

import { redirect } from "next/navigation";

import { requestPasswordReset, resetPassword } from "@/features/admin/password-service";
import { type ActionState, runAction } from "@/lib/http/run-action";

/** Request recovery without disclosing whether the email has an active account. */
export async function requestPasswordResetAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(() => requestPasswordReset(formData));
}
/** Change a password only after a verified recovery grant, then return to login. */
export async function resetPasswordAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = await runAction(() => resetPassword(formData));
  if (result.success) {
    redirect("/admin/login?notice=password_reset");
  }

  return result;
}
