"use client";

import { type SetStateAction, useCallback, useRef, useSyncExternalStore } from "react";

const listeners = new Map<string, Set<() => void>>();
const snapshots = new Map<string, { raw: string; value: unknown }>();
/** Keep UI state synchronized with this tab's session storage across component mounts. */
export function usePersistentState<T>(key: string, initial: T) {
  const initialRef = useRef(initial);
  const read = useCallback((): T => {
    if (typeof window === "undefined") {
      return initialRef.current;
    }

    try {
      const raw = sessionStorage.getItem(`ui:${key}`);
      if (raw === null) {
        return initialRef.current;
      }

      const cached = snapshots.get(key);
      if (cached?.raw === raw) {
        return cached.value as T;
      }

      const value = JSON.parse(raw) as T;
      snapshots.set(key, { raw, value });

      return value;
    } catch {
      return (snapshots.get(key)?.value as T) ?? initialRef.current;
    }
  }, [key]);
  const subscribe = useCallback(
    (listener: () => void) => {
      const group = listeners.get(key) ?? new Set<() => void>();
      group.add(listener);
      listeners.set(key, group);

      return () => {
        group.delete(listener);
      };
    },
    [key],
  );
  const value = useSyncExternalStore(subscribe, read, () => initialRef.current);
  const setValue = useCallback(
    (next: SetStateAction<T>) => {
      const updated = typeof next === "function" ? (next as (value: T) => T)(read()) : next;
      const raw = JSON.stringify(updated);
      snapshots.set(key, { raw, value: updated });

      try {
        sessionStorage.setItem(`ui:${key}`, raw);
      } catch {
        /* Retain state in memory when storage is disabled. */
      }

      listeners.get(key)?.forEach((listener) => listener());
    },
    [key, read],
  );

  return [value, setValue] as const;
}
