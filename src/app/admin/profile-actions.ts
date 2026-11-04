"use server";

import { saveAdminProfile } from "@/features/admin/profile-service";
import { type ActionState, runAction } from "@/lib/http/run-action";

/** Save the current password-authenticated admin's own profile. */
export async function saveProfileAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(() => saveAdminProfile(formData));
}
