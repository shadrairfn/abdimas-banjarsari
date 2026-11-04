import "server-only";
import { getActiveAdmin } from "@/lib/auth/admin";
import { getOwnerKey } from "@/lib/auth/owner";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logActivity } from "@/lib/activity-log";
import { adminActor } from "@/features/umkm/umkm-service";

/** Failure auditing never stores request bodies, passwords, owner keys, or OAuth codes. */
export async function auditFailure(status: number, message: string) {
  try {
    if (!isSupabaseConfigured() || status === 401 || status === 403) return;
    const admin = await getActiveAdmin(await createSupabaseServerClient());
    const key = admin ? null : await getOwnerKey();
    await logActivity({ action: "access_denied", entityType: "session", entityLabel: "Permintaan tidak berhasil", summary: status >= 500 ? "Permintaan gagal karena kesalahan layanan" : message.slice(0, 300),
      actor: admin ? adminActor(admin) : key ? { type: "owner", keyId: key.id, keyHint: key.key_hint, name: key.owner_label || "Pemilik" } : { type: "system", name: "Pengunjung" } });
  } catch { /* Preserve the original error even when auditing is unavailable. */ }
}
