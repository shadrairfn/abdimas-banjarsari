"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const openDialogs: symbol[] = [];
let bodyOverflowBeforeDialogs = "";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  width?: number;
  labelledBy?: string;
  // Hide the corner X for confirmation dialogs.
  hideClose?: boolean;
  className?: string;
  overlayClassName?: string;
  ariaLabel?: string;
  children: ReactNode;
}

/** Modal built from the `.dlg` card of the design on a 50% black overlay. */
export function Dialog({
  open,
  onClose,
  width = 420,
  labelledBy,
  hideClose = false,
  className = "",
  overlayClassName = "",
  ariaLabel,
  children,
}: DialogProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open || !isMounted) {
      return;
    }

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialogId = Symbol("dialog");
    if (openDialogs.length === 0) {
      bodyOverflowBeforeDialogs = document.body.style.overflow;
    }

    openDialogs.push(dialogId);
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
    (focusable()[0] ?? dialogRef.current)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      // A photo preview can open above a form; only the topmost dialog handles keys.
      if (openDialogs.at(-1) !== dialogId) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }

      if (event.key !== "Tab") {
        return;
      }

      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) {
        event.preventDefault();

        return;
      }

      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialogRef.current)
      ) {
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
      const dialogIndex = openDialogs.indexOf(dialogId);
      if (dialogIndex !== -1) {
        openDialogs.splice(dialogIndex, 1);
      }

      if (openDialogs.length === 0) {
        document.body.style.overflow = bodyOverflowBeforeDialogs;
      }

      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
  }, [open, isMounted]);

  if (!open || !isMounted) {
    return null;
  }

  return createPortal(
    <div
      className={`dlg-overlay ${overlayClassName}`.trim()}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={`dlg ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
        tabIndex={-1}
        style={{ width }}
      >
        {!hideClose && (
          <button type="button" className="x" aria-label="Tutup" onClick={onClose}>
            <X className="i sm" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
