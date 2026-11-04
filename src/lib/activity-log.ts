import "server-only";
import { headers } from "next/headers";
import type { ActivityAction, ActivityActorType, ActivityChange, ActivityEntityType } from "@/features/activity/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

export interface ActivityEntry {
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string | null;
  entityLabel: string;
  entitySub?: string;
  actor:
    | { type: "admin" | "superadmin" | "system"; id?: string | null; name: string }
    | { type: "owner"; keyId: string; name: string; keyHint: string };
  summary?: string;
  changes?: ActivityChange[];
}

const USER_AGENT_MAX_LENGTH = 200;

/** "103.28.14.7" becomes "103.28.•••.•••": enough to spot odd access without keeping the full address. */
function maskIp(raw: string | null) {
  const ip = raw?.split(",")[0]?.trim();
  if (!ip) return "";

  if (ip.includes(".")) {
    const [first, second] = ip.split(".");
    return `${first}.${second}.•••.•••`;
  }

  return `${ip.split(":").slice(0, 2).join(":")}:••••`;
}

async function readRequestInfo() {
  try {
    const requestHeaders = await headers();
    return {
      ipMasked: maskIp(requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip")),
      userAgent: (requestHeaders.get("user-agent") ?? "").slice(0, USER_AGENT_MAX_LENGTH),
    };
  } catch {
    return { ipMasked: "", userAgent: "" };
  }
}

/**
 * Append one entry to the activity log. The change that is being logged has already succeeded,
 * so a failure here is reported to the server log but never turned into a failure for the user.
 */
export async function logActivity(entry: ActivityEntry) {
  try {
    const { ipMasked, userAgent } = await readRequestInfo();
    const isOwner = entry.actor.type === "owner";
    const changes = entry.changes ?? [];

    const { error } = await createSupabaseAdminClient().from("activity_logs").insert({
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      entity_label: entry.entityLabel,
      entity_sub: entry.entitySub ?? null,
      actor_type: entry.actor.type satisfies ActivityActorType,
      actor_id: entry.actor.type === "owner" ? entry.actor.keyId : entry.actor.id ?? null,
      actor_name: entry.actor.name,
      actor_key_hint: entry.actor.type === "owner" ? entry.actor.keyHint : null,
      summary: entry.summary ?? "",
      changes,
      source: isOwner ? "Kunci akses pemilik" : entry.actor.type === "system" ? "Halaman masuk" : entry.actor.type === "superadmin" ? "Dashboard Superadmin" : "Dashboard Admin",
      ip_masked: ipMasked,
      user_agent: userAgent,
    });

    if (error) console.error("Activity log insert failed:", error.message);
  } catch (error) {
    console.error("Activity log failed:", error);
  }
}
