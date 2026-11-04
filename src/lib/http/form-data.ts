import { ApiResponse } from "./api-response";

/** Read a structured form array without silently replacing invalid input with empty data. */
export function parseFormArray(
  value: FormDataEntryValue | null,
  fieldName: string,
  isAllowCommaSeparated = false,
): unknown[] {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(value);
  } catch {
    if (isAllowCommaSeparated) {
      return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }

    throw new ApiResponse(400, `Format ${fieldName} tidak valid.`);
  }

  if (!Array.isArray(parsedValue)) {
    throw new ApiResponse(400, `${fieldName} harus berupa daftar.`);
  }

  return parsedValue;
}
