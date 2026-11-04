export type OwnerKeyStatus = "active" | "pending" | "revoked" | "expired";

export const OWNER_KEY_STATUS_LABELS: Record<OwnerKeyStatus, string> = {
  active: "Aktif",
  pending: "Belum dipakai",
  revoked: "Dicabut",
  expired: "Kedaluwarsa",
};

/** What the admin sees about a key. The key itself is never stored, only a hint of it. */
export interface OwnerKeySummary {
  id: string;
  hint: string;
  umkmId: string | null;
  umkmName: string;
  ownerLabel: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  status: OwnerKeyStatus;
}

export const OWNER_KEY_EXPIRY_OPTIONS = [
  { value: "none", label: "Tanpa batas", days: null },
  { value: "7", label: "7 hari", days: 7 },
  { value: "30", label: "30 hari", days: 30 },
  { value: "90", label: "90 hari", days: 90 },
] as const;

export type OwnerKeyExpiryValue = (typeof OWNER_KEY_EXPIRY_OPTIONS)[number]["value"];

export function ownerKeyStatus(key: { revokedAt: string | null; expiresAt: string | null; lastUsedAt: string | null }, now = Date.now()): OwnerKeyStatus {
  if (key.revokedAt) return "revoked";
  if (key.expiresAt && new Date(key.expiresAt).getTime() <= now) return "expired";
  return key.lastUsedAt ? "active" : "pending";
}

/** "BNJ-7K2F" becomes "BNJ-7K2F-••••", the way a key is shown after it was created. */
export function maskedKey(hint: string) {
  return `${hint}-••••`;
}
