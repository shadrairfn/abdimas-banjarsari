import { NextRequest, NextResponse } from "next/server";

import { getGoogleSignInDestination } from "@/features/admin/google-auth-service";
import { asyncHandler } from "@/lib/http/async-handler";

/** Start Google sign-in through the configured Supabase provider. @route GET /auth/google */
export const GET = asyncHandler(async (request: NextRequest) => {
  const destination = await getGoogleSignInDestination(request.nextUrl.origin);

  return NextResponse.redirect(destination);
});
