import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { ApiResponse } from "@/lib/http/api-response";
import { OWNER_KEY_MAX_LENGTH, OWNER_KEY_MIN_LENGTH } from "@/features/umkm/validation";

// No 0/O or 1/I so a key read aloud or from a screenshot is hard to mistype.
const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const KEY_PREFIX = "BNJ";
const KEY_GROUP_SIZE = 4;
const GENERATED_GROUPS = 2;

/** The secret used to hash keys and to sign owner sessions. */
export function ownerSecret() {
  const secret = process.env.OWNER_KEY_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new ApiResponse(500, "OWNER_KEY_SECRET atau SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di environment server.");
  }

  return secret;
}

/** Uppercase letters and digits only, so "bnj-7k2f 9qxm" and "BNJ7K2F9QXM" are the same key. */
export function normalizeKey(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Show a normalized key as "BNJ-7K2F-9QXM" (generated) or in groups of four (typed by an admin). */
export function formatKey(normalized: string) {
  if (normalized.startsWith(KEY_PREFIX) && normalized.length === KEY_PREFIX.length + KEY_GROUP_SIZE * GENERATED_GROUPS) {
    const body = normalized.slice(KEY_PREFIX.length);
    return `${KEY_PREFIX}-${body.slice(0, KEY_GROUP_SIZE)}-${body.slice(KEY_GROUP_SIZE)}`;
  }

  return normalized.match(new RegExp(`.{1,${KEY_GROUP_SIZE}}`, "g"))?.join("-") ?? normalized;
}

/** The part of a key that is safe to show later, for example "BNJ-7K2F". */
export function keyHint(normalized: string) {
  const groups = formatKey(normalized).split("-");
  const isGenerated = groups[0] === KEY_PREFIX && groups.length === GENERATED_GROUPS + 1;
  return groups.slice(0, isGenerated ? 2 : 1).join("-");
}

export function generateKey() {
  let body = "";
  for (let index = 0; index < KEY_GROUP_SIZE * GENERATED_GROUPS; index += 1) {
    body += KEY_ALPHABET[randomInt(KEY_ALPHABET.length)];
  }

  return normalizeKey(`${KEY_PREFIX}${body}`);
}

/** @throws {ApiResponse} 400 if a key typed by an admin is too short or too long */
export function assertValidCustomKey(normalized: string) {
  if (normalized.length < OWNER_KEY_MIN_LENGTH || normalized.length > OWNER_KEY_MAX_LENGTH) {
    throw new ApiResponse(400, `Kunci harus terdiri dari ${OWNER_KEY_MIN_LENGTH}–${OWNER_KEY_MAX_LENGTH} huruf atau angka.`);
  }
}

export function hashKey(normalized: string) {
  return createHmac("sha256", ownerSecret()).update(`owner-key:${normalized}`).digest("hex");
}
