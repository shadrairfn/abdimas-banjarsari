"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption<Value extends string> {
  value: Value;
  label: string;
}

interface SelectMenuProps<Value extends string> {
  value: Value;
  options: SelectOption<Value>[];
  onChange: (value: Value) => void;
  ariaLabel: string;
  width?: number | string;
  // Text shown on the button when it differs from the option label (for example "≤ 1 km").
  display?: string;
  // Replaces the input-like button with a small inline trigger, for example a badge inside a table row.
  trigger?: ReactNode;
  disabled?: boolean;
}

/** The `.inp.sel` dropdown of the design with a small menu below it. */
export function SelectMenu<Value extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  width,
  display,
  trigger,
  disabled,
}: SelectMenuProps<Value>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        containerRef.current?.querySelector<HTMLButtonElement>('button[aria-haspopup="listbox"]')?.focus();
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="dd" ref={containerRef} style={{ width }}>
      <button
        type="button"
        className={trigger ? "inline-trigger" : "inp sel"}
        style={trigger ? undefined : { width: "100%" }}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        {trigger ?? <span>{display ?? current?.label}</span>}
        <ChevronDown className={trigger ? "i xs" : "i sm"} />
      </button>
      {open && (
        <div className="menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={option.value === value ? "on" : ""}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
