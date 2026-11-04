"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Dialog } from "@/components/dialog";
import { displayText } from "@/features/umkm/format";
import type { Umkm } from "@/features/umkm/types";

export function DeleteDialog({ item, onClose }: { item: Umkm; onClose: () => void }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState("");

  async function deleteUmkm() {
    setIsPending(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/umkm/${item.id}`, { method: "DELETE" });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "UMKM gagal dihapus.");
      }

      onClose();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "UMKM gagal dihapus.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open onClose={onClose} hideClose labelledBy="delete-title">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 id="delete-title">Hapus {displayText(item.brand)}?</h2>
        <p>Data dan penandanya akan dihapus permanen.</p>
      </div>
      {message && (
        <div className="alert alert-err" role="alert">
          <span style={{ color: "var(--des)" }}>{message}</span>
        </div>
      )}
      <div className="ft">
        <button type="button" className="btn o" onClick={onClose} disabled={isPending}>
          Batal
        </button>
        <button type="button" className="btn d" onClick={deleteUmkm} disabled={isPending}>
          {isPending && <Loader2 className="i spin" />}Hapus
        </button>
      </div>
    </Dialog>
  );
}
