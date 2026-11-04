import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { UMKM_COLUMNS, toPublicUmkm, type DatabaseUmkm } from "@/data/umkm-repository";
import { diffUmkm, summarizeChanges } from "@/features/activity/diff";
import { villageName } from "@/features/umkm/format";
import type { Umkm } from "@/features/umkm/types";
import type { UmkmInput } from "@/features/umkm/validation";
import { logActivity, type ActivityEntry } from "@/lib/activity-log";
import { ApiResponse } from "@/lib/http/api-response";
import { revalidateUmkmPages } from "@/lib/revalidate";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

/** Who is changing the data: a logged-in admin, or an owner holding a key. */
export type UmkmActor =
  | { type: "admin" | "superadmin"; id: string; name: string }
  | { type: "owner"; keyId: string; keyHint: string; name: string; umkmId: string | null };



export function adminActor(user: User & { adminRole?: "superadmin" | "admin"; profileName?: string }): Extract<UmkmActor, { type: "admin" | "superadmin" }> {
  const fullName = user.profileName || user.user_metadata?.full_name;
  return { type: user.adminRole ?? "admin", id: user.id, name: typeof fullName === "string" && fullName ? fullName : (user.email ?? "Admin") };
}

function logActor(actor: UmkmActor): ActivityEntry["actor"] {
  return actor.type === "owner"
    ? { type: "owner", keyId: actor.keyId, keyHint: actor.keyHint, name: actor.name }
    : { type: actor.type, id: actor.id, name: actor.name };
}

function umkmSub(item: Pick<Umkm, "address">) {
  return `UMKM · ${villageName(item.address)}`;
}

async function fetchUmkm(db: SupabaseClient, id: string) {
  const { data, error } = await db.from("umkm").select(UMKM_COLUMNS).eq("id", id).maybeSingle();

  if (error) throw new ApiResponse(500, `Gagal memuat data UMKM: ${error.message}`);

  return data ? toPublicUmkm(data as unknown as DatabaseUmkm) : undefined;
}

async function findCategoryId(db: SupabaseClient, name: string) {
  const { data, error } = await db.from("categories").select("id").eq("name", name).eq("is_active", true).single();

  if (error || !data) throw new ApiResponse(404, "Kategori tidak ditemukan.");

  return data.id as string;
}

/**
 * Create a UMKM, or update the one the actor may edit: an admin edits the UMKM named in the form,
 * an owner only ever edits the UMKM of the key. Writes the change to the activity log.
 * @throws {ApiResponse} 404 unknown category or UMKM, 500 if the database fails
 */
export async function saveUmkm(db: SupabaseClient, actor: UmkmActor, input: UmkmInput) {
  const categoryId = await findCategoryId(db, input.subCategory);
  const targetId = actor.type === "owner" ? actor.umkmId : input.id || null;
  const before = targetId ? await fetchUmkm(db, targetId) : undefined;

  if (targetId && !before) throw new ApiResponse(404, "UMKM tidak ditemukan.");

  const record = {
    name: input.name,
    owner_name: input.ownerName || null,
    products: input.products || input.catalog.map(product => product.name).join(", ").slice(0, 500) || null,
    address: input.address || null,
    category_id: categoryId,
    latitude: input.latitude,
    longitude: input.longitude,
    price_description: input.priceDescription || null,
    catalog: input.catalog,
    featured_product: input.featuredProduct || null,
    notes: input.notes || null,
    google_maps_url: input.googleMapsUrl || null,
    contact: input.contact || null,
    socials: input.socials,
    // The old single column keeps the first link for anything that still reads it.
    website: input.socials[0]?.handle ?? null,
    opening_hours: input.openingHours || null,
    closing_hours: input.closingHours || null,
    photos: input.photos,
    is_active: true,
  };

  const query = targetId
    ? db.from("umkm").update(record).eq("id", targetId)
    : db.from("umkm").insert(record);
  const { data, error } = await query.select(UMKM_COLUMNS).single();

  if (error) throw new ApiResponse(500, error.message);

  const after = toPublicUmkm(data as unknown as DatabaseUmkm);

  if (!before && actor.type === "owner") {
    await linkKeyToUmkm(actor.keyId, after.id);
  }

  await recordSave(actor, before, after);
  revalidateUmkmPages(after.id);

  return { id: after.id, created: !before };
}

// The first save of an owner key creates the UMKM, so the key has to point at it from then on.
async function linkKeyToUmkm(keyId: string, umkmId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("owner_keys").update({ umkm_id: umkmId }).eq("id", keyId);

  if (error) {
    await admin.from("umkm").delete().eq("id", umkmId);
    throw new ApiResponse(500, `Kunci gagal dihubungkan ke usaha: ${error.message}`);
  }
}

async function recordSave(actor: UmkmActor, before: Umkm | undefined, after: Umkm) {
  const base = { entityType: "umkm" as const, entityId: after.id, entityLabel: after.brand, entitySub: umkmSub(after), actor: logActor(actor) };

  if (!before) {
    const by = actor.type === "owner" ? "oleh pemilik" : actor.type === "superadmin" ? "oleh Superadmin" : "oleh Admin";
    await logActivity({ ...base, action: "create", summary: `UMKM baru ditambahkan ${by}` });
    return;
  }

  const changes = diffUmkm(before, after);
  await logActivity({ ...base, action: "update", summary: changes.length ? summarizeChanges(changes) : "Data disimpan tanpa perubahan", changes });
}

/**
 * Delete one UMKM and log it. Admin only; owners can never delete.
 * @throws {ApiResponse} 404 if the UMKM does not exist, 500 if the database fails
 */
export async function deleteUmkm(db: SupabaseClient, actor: UmkmActor, id: string) {
  const before = await fetchUmkm(db, id);

  if (!before) throw new ApiResponse(404, "UMKM tidak ditemukan.");

  const { data, error } = await db.from("umkm").delete().eq("id", id).select("id").maybeSingle();

  if (error) throw new ApiResponse(500, `UMKM gagal dihapus: ${error.message}`);
  if (!data) throw new ApiResponse(404, "UMKM tidak ditemukan.");

  await logActivity({
    action: "delete",
    entityType: "umkm",
    entityId: id,
    entityLabel: before.brand,
    entitySub: umkmSub(before),
    actor: logActor(actor),
    summary: "Data dan penanda dihapus permanen",
  });
  revalidateUmkmPages(id);
}
