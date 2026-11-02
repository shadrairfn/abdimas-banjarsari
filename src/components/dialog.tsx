"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  width?: number;
  labelledBy?: string;
  // Hide the corner X for confirmation dialogs.
  hideClose?: boolean;
  children: ReactNode;
}

/** Modal built from the `.dlg` card of the design on a 50% black overlay. */
export function Dialog({ open, onClose, width = 420, labelledBy, hideClose = false, children }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dlg-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby={labelledBy} style={{ width }}>
        {!hideClose && (
          <button type="button" className="x" aria-label="Tutup" onClick={onClose}>
            <X className="i sm" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
