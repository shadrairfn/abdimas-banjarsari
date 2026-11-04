import { NextRequest, NextResponse } from "next/server";

import { completeAuthCallback } from "@/features/admin/auth-callback-service";
import { asyncHandler } from "@/lib/http/async-handler";

/** Complete OAuth/recovery and redirect to a fixed application page. @route GET /auth/callback */
export const GET = asyncHandler(async (request: NextRequest) => {
  const destination = await completeAuthCallback(request.nextUrl);

  return NextResponse.redirect(destination);
});
