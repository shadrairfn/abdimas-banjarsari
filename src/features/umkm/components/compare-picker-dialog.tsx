"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { Dialog } from "@/components/dialog";
import { CategoryIcon } from "@/features/umkm/categories";
import { displayText, villageName } from "@/features/umkm/format";
import type { Umkm } from "@/features/umkm/types";

const PICKER_LIMIT = 100;
export function ComparePickerDialog({
  items,
  excludeId,
  onPick,
  onClose,
}: {
  items: Umkm[];
  excludeId?: string;
  onPick: (item: Umkm) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
  const matches = items
    .filter((item) => item.id !== excludeId)
    .filter((item) => {
      if (!normalizedQuery) {
        return true;
      }

      const text = `${item.brand} ${item.ownerName} ${item.products} ${item.subCategory} ${villageName(item.address)}`;

      return normalizedQuery
        .split(/\s+/)
        .every((word) => text.toLocaleLowerCase("id-ID").includes(word));
    });

  return (
    <Dialog open onClose={onClose} width={480} labelledBy="picker-title">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 id="picker-title">{excludeId ? "Pilih usaha kedua" : "Pilih usaha pertama"}</h2>
        <p>
          {excludeId
            ? `Bandingkan dengan ${displayText(items.find((item) => item.id === excludeId)?.brand ?? "usaha pilihan Anda")}. Pilih satu usaha lain di bawah.`
            : "Langkah 1 dari 2: pilih usaha pertama untuk dibandingkan."}
        </p>
      </div>
      <label className="inp">
        <Search className="i" />
        <input
          autoFocus
          placeholder="Cari nama, produk, atau kampung"
          aria-label="Cari UMKM"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="cmp-pick-list">
        {matches.slice(0, PICKER_LIMIT).map((item) => (
          <button key={item.id} type="button" className="menu-row" onClick={() => onPick(item)}>
            <span className="sq">
              <CategoryIcon category={item.subCategory} />
            </span>
            <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
              <span className="ell fw5" style={{ display: "block" }}>
                {displayText(item.brand)}
              </span>
              <span className="mut ell" style={{ display: "block", fontSize: 13 }}>
                {item.subCategory} · {villageName(item.address)}
              </span>
            </span>
          </button>
        ))}
        {matches.length === 0 && <p style={{ padding: 8 }}>Tidak ada UMKM yang cocok.</p>}
        {matches.length > PICKER_LIMIT && (
          <p style={{ padding: 8, fontSize: 13 }}>Persempit pencarian untuk melihat yang lain.</p>
        )}
      </div>
      <div className="ft">
        <button type="button" className="btn o" onClick={onClose}>
          Batal
        </button>
      </div>
    </Dialog>
  );
}
