import { ApiResponse } from "@/lib/http/api-response";
import { auditFailure } from "@/lib/audit-failure";

const INTERNAL_ERROR_MESSAGE = "Terjadi kesalahan pada server.";

/**
 * Global error handler of every route handler.
 * An ApiResponse keeps its own status and message, any other error becomes a generic 500
 * so internal details are never sent to the browser.
 */
export function errorHandler(error: unknown): Response {
  if (error instanceof ApiResponse) {
    return Response.json(
      {
        success: false,
        message: error.message,
        errors: error.errors,
        data: null,
      },
      { status: error.statusCode },
    );
  }

  console.error("Unhandled route error:", error);

  return Response.json(
    {
      success: false,
      message: INTERNAL_ERROR_MESSAGE,
      errors: [],
      data: null,
    },
    { status: 500 },
  );
}

/**
 * Wrap a route handler so it never needs try/catch.
 * Errors thrown inside the handler are answered by `errorHandler`.
 */
export function asyncHandler<Req extends Request, Context = unknown>(
  handler: (request: Req, context: Context) => Promise<Response>,
) {
  return async (request: Req, context: Context): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      await auditFailure(error instanceof ApiResponse ? error.statusCode : 500, error instanceof ApiResponse ? error.message : "Kesalahan layanan");
      return errorHandler(error);
    }
  };
}
