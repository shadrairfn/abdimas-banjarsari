"use client";

import { Store } from "lucide-react";

export function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Store;
}) {
  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div
        className="mut"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>{label}</span>
        <Icon className="i" />
      </div>
      <div
        style={{
          fontSize: 28,
          lineHeight: "32px",
          fontWeight: 600,
          marginTop: 8,
          letterSpacing: "-.02em",
        }}
      >
        {value}
      </div>
    </div>
  );
}
