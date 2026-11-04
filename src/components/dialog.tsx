"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!open || !mounted) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
    ) ?? []).filter((element) => element.getClientRects().length > 0);
    (focusable()[0] ?? dialogRef.current)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="dlg-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} className="dlg" role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} style={{ width }}>
        {!hideClose && (
          <button type="button" className="x" aria-label="Tutup" onClick={onClose}>
            <X className="i sm" />
          </button>
        )}
        {children}
      </div>
    </div>, document.body
  );
}
