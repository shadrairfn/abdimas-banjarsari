// Same alphabet as the server (no 0/O or 1/I). 32 characters, so every random byte maps without bias.
const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GROUP_SIZE = 4;

/** A suggestion such as "BNJ-7K2F-9QXM" for the key field. The admin may keep it, retype it or roll again. */
export function suggestKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(GROUP_SIZE * 2));
  const characters = Array.from(bytes, (byte) => KEY_ALPHABET[byte % KEY_ALPHABET.length]);

  return `BNJ-${characters.slice(0, GROUP_SIZE).join("")}-${characters.slice(GROUP_SIZE).join("")}`;
}

/** Message an admin sends to the owner together with the key. */
export function inviteMessage(ownerLabel: string, key: string, origin: string) {
  const greeting = ownerLabel ? `Halo ${ownerLabel}` : "Halo";

  return `${greeting}, ini kunci akses untuk mengisi atau mengubah data usaha Anda di UMKM Banjarsari Banjarsari.\n\nBuka: ${origin}/pemilik\nKunci: ${key}\n\nJangan bagikan kunci ini kepada orang lain.`;
}
