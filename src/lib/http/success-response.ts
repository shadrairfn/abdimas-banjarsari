/**
 * The one success shape of the backend.
 * Every successful response has the keys: success, message, data.
 */
export class SuccessResponse<T = null> {
  readonly statusCode: number;
  readonly message: string;
  readonly data: T;
  readonly success: boolean;

  constructor(statusCode: number, message = "Berhasil.", data: T = null as T) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = statusCode < 400;
  }
}

/** Turn a SuccessResponse into the HTTP response of a route handler. */
export function sendSuccess<T>(response: SuccessResponse<T>): Response {
  if (response.statusCode === 204) {
    return new Response(null, { status: response.statusCode });
  }

  return Response.json(response, { status: response.statusCode });
}
