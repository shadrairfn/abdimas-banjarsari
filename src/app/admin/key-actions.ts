"use server";

import {
  createOwnerKey,
  regenerateOwnerKey,
  revokeOwnerKey,
} from "@/features/owner/owner-key-service";
import type { IssueKeyState, OwnerKeyStatus } from "@/features/owner/types";
import { type DataActionState, runActionWithData } from "@/lib/http/run-action";

export type { IssuedKey, IssueKeyState } from "@/features/owner/types";
/** Issue an owner key and expose its plaintext only in this response. */
export async function createOwnerKeyAction(payload: unknown): Promise<IssueKeyState> {
  return runActionWithData(() => createOwnerKey(payload));
}
/** Replace a key while preserving ownership and access expiry. */
export async function regenerateOwnerKeyAction(id: string): Promise<IssueKeyState> {
  return runActionWithData(() => regenerateOwnerKey(id));
}
/** Revoke the selected owner key after checking admin access. */
export async function revokeOwnerKeyAction(
  id: string,
): Promise<DataActionState<{ status: OwnerKeyStatus }>> {
  return runActionWithData(() => revokeOwnerKey(id));
}
