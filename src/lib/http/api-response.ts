/**
 * The one error shape of the backend.
 * Throw it from route handlers, server actions, repositories and services:
 * `throw new ApiResponse(404, "UMKM tidak ditemukan.")`
 */
export class ApiResponse extends Error {
  readonly statusCode: number;
  readonly success = false;
  readonly data = null;
  readonly errors: string[];

  constructor(statusCode: number, message = "Terjadi kesalahan.", errors: string[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
