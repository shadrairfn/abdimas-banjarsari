import { ApiResponse } from "@/lib/http/api-response";
import { asyncHandler } from "@/lib/http/async-handler";
import { sendSuccess, SuccessResponse } from "@/lib/http/success-response";

/** Accept legacy telemetry requests from older tabs without recording activity. */
export const POST = asyncHandler(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new ApiResponse(403, "Asal permintaan tidak diizinkan.");
  }

  return sendSuccess(new SuccessResponse(204, "Aktivitas ini tidak dicatat."));
});
