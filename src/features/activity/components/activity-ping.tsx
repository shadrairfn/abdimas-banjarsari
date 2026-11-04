"use client";
import { useEffect } from "react";
import { trackActivity } from "../client";
import type { ActivityEntityType } from "../types";
export function ActivityPing({ label, entityType = "umkm" }: { label: string; entityType?: ActivityEntityType }) {
  useEffect(() => { const timer = setTimeout(() => trackActivity("view", entityType, label), 0); return () => clearTimeout(timer); }, [label, entityType]);
  return null;
}
