"use client";

import { useCallback } from "react";
import { upsertUmkmAction } from "@/app/admin/actions";
import { Dialog } from "@/components/dialog";
import { UmkmForm } from "@/features/umkm/components/umkm-form";
import type { Umkm } from "@/features/umkm/types";

const CLOSE_DELAY_MS = 600;

interface UmkmFormDialogProps {
  // null creates a new UMKM, an item edits it.
  item: Umkm | null;
  onClose: () => void;
}

/** The admin's add/edit dialog around the shared UMKM form. */
export function UmkmFormDialog({ item, onClose }: UmkmFormDialogProps) {
  // Leave the success message visible for a moment before the dialog closes.
  const closeSoon = useCallback(() => {
    setTimeout(onClose, CLOSE_DELAY_MS);
  }, [onClose]);

  return (
    <Dialog open onClose={onClose} width={1060} labelledBy="umkm-form-title">
      <h2 id="umkm-form-title">{item ? "Edit UMKM" : "Tambah UMKM"}</h2>
      <UmkmForm item={item} action={upsertUmkmAction} uploadUrl="/api/admin/upload" sendId onSaved={closeSoon} onCancel={onClose} />
    </Dialog>
  );
}
