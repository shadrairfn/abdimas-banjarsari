import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveAdmin } from "@/lib/auth/admin";
import { getOwnerKey } from "@/lib/auth/owner";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";
import { adminActor } from "@/features/umkm/umkm-service";

const inputSchema = z.object({ action: z.enum(["view", "export"]), entityType: z.enum(["umkm", "owner_key", "admin", "category", "profile", "session", "photo"]), label: z.string().trim().min(1).max(160), summary: z.string().max(300).optional().default("") });
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  let input;
  try { input = inputSchema.parse(await request.json()); } catch { return new NextResponse(null, { status: 400 }); }
  const admin = await getActiveAdmin(await createSupabaseServerClient());
  const key = admin ? null : await getOwnerKey();
  if (!admin && !key) return new NextResponse(null, { status: 204 });
  await logActivity({ action: input.action, entityType: input.entityType, entityLabel: input.label, summary: input.summary,
    actor: admin ? adminActor(admin) : { type: "owner", keyId: key!.id, keyHint: key!.key_hint, name: key!.owner_label || "Pemilik" } });
  return new NextResponse(null, { status: 204 });
}
