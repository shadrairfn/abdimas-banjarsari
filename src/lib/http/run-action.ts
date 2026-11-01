import { ApiResponse } from "@/lib/http/api-response";
import type { SuccessResponse } from "@/lib/http/success-response";

/** Plain object returned to the browser, because server actions cannot return class instances. */
export type ActionState = { success: boolean; message: string };

const INTERNAL_ERROR_MESSAGE = "Terjadi kesalahan pada server.";
const NEXT_CONTROL_FLOW_PREFIX = "NEXT_";

// redirect() and notFound() work by throwing, they must reach Next.js untouched.
function isNextControlFlowError(error: unknown) {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith(NEXT_CONTROL_FLOW_PREFIX);
}

/**
 * Server action version of `asyncHandler`.
 * The action body returns a SuccessResponse or throws an ApiResponse,
 * this function turns both into the `ActionState` used by `useActionState`.
 */
export async function runAction(action: () => Promise<SuccessResponse<unknown>>): Promise<ActionState> {
  try {
    const result = await action();
    return { success: result.success, message: result.message };
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;

    if (error instanceof ApiResponse) {
      return { success: false, message: error.message };
    }

    console.error("Unhandled action error:", error);
    return { success: false, message: INTERNAL_ERROR_MESSAGE };
  }
}
