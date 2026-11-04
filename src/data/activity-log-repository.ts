import "server-only";

import type {
  ActivityAction,
  ActivityActorType,
  ActivityChange,
  ActivityEntityType,
  ActivityLog,
} from "@/features/activity/types";
import { RECORDED_ACTIVITY_ACTIONS } from "@/features/activity/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LOG_LIMIT = 500;

type DatabaseLog = {
  id: string;
  created_at: string;
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id: string | null;
  entity_label: string;
  entity_sub: string | null;
  actor_type: ActivityActorType;
  actor_name: string;
  actor_key_hint: string | null;
  summary: string;
  changes: ActivityChange[] | null;
  source: string | null;
  ip_masked: string | null;
  user_agent: string | null;
};

export interface ActivityLogResult {
  items: ActivityLog[];
  // Shown to the admin instead of breaking the whole dashboard, for example when the migration was not applied.
  error?: string;
}

/** The newest log entries, read with the admin's own session so row-level security applies. */
export async function listActivityLogs(): Promise<ActivityLogResult> {
  if (!isSupabaseConfigured()) {
    return { items: [] };
  }

  const supabase = await createSupabaseServerClient();
  const { data: activityRows, error } = await supabase
    .from("activity_logs")
    .select(
      "id,created_at,action,entity_type,entity_id,entity_label,entity_sub,actor_type,actor_name,actor_key_hint,summary,changes,source,ip_masked,user_agent",
    )
    .in("action", [...RECORDED_ACTIVITY_ACTIONS])
    .order("created_at", { ascending: false })
    .limit(LOG_LIMIT);

  if (error) {
    return { items: [], error: `Log aktivitas gagal dimuat: ${error.message}` };
  }

  return {
    items: (activityRows as DatabaseLog[]).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityLabel: row.entity_label,
      entitySub: row.entity_sub ?? "",
      actorType: row.actor_type,
      actorName: row.actor_name,
      actorKeyHint: row.actor_key_hint ?? "",
      summary: row.summary,
      changes: Array.isArray(row.changes) ? row.changes : [],
      source: row.source ?? "",
      ipMasked: row.ip_masked ?? "",
      userAgent: row.user_agent ?? "",
    })),
  };
}
