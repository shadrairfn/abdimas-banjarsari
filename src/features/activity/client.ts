"use client";
import type { ActivityEntityType } from "./types";
export function trackActivity(action: "view" | "export", entityType: ActivityEntityType, label: string, summary = "") {
  void fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, entityType, label, summary }), keepalive: true }).catch(() => {});
}
