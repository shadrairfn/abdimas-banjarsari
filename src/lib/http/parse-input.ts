import type { z } from "zod";
import { ApiResponse } from "@/lib/http/api-response";

/**
 * Validate input with a Zod schema and fail early.
 * @throws {ApiResponse} 400 with the first issue as message and every issue in `errors`
 */
export function parseInput<Schema extends z.ZodType>(schema: Schema, input: unknown): z.output<Schema> {
  const result = schema.safeParse(input);

  if (!result.success) {
    const messages = result.error.issues.map((issue) => issue.message);
    throw new ApiResponse(400, messages[0] ?? "Data tidak valid.", messages);
  }

  return result.data;
}
