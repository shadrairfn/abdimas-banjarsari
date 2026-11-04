import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { ownerSecret } from "@/lib/owner/key";

const SESSION_COOKIE = "owner_session";
const SESSION_SECONDS = 12 * 60 * 60;

function sign(payload: string) {
  return createHmac("sha256", ownerSecret()).update(`owner-session:${payload}`).digest("hex");
}

/**
 * Remember which key the browser unlocked. The cookie holds the key id and an expiry, signed with the
 * server secret; it never contains the key itself, and every request re-checks the key in the database
 * so a revoked key stops working at once.
 */
export async function createOwnerSession(keyId: string) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${keyId}.${expires}`;
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

/** Delete the signed owner-session cookie on logout. */
export async function clearOwnerSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The key id of a valid, unexpired session cookie, or null. */
export async function readOwnerSessionKeyId(): Promise<string | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) {
    return null;
  }

  const [keyId, expires, signature] = raw.split(".");
  if (!keyId || !expires || !signature) {
    return null;
  }

  if (Number(expires) < Math.floor(Date.now() / 1000)) {
    return null;
  }

  const expected = Buffer.from(sign(`${keyId}.${expires}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  return keyId;
}
