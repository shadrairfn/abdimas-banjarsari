const STORAGE_KEY = "compare_ids";

export const COMPARE_MAX = 2;

/** Link to the comparison page for one or two UMKM. */
export function compareHref(ids: readonly string[]) {
  const [first, second] = ids;
  const params = new URLSearchParams();
  if (first) params.set("a", first);
  if (second) params.set("b", second);

  return `/bandingkan${params.size > 0 ? `?${params}` : ""}`;
}

/**
 * Add an id to the compare list. When two are already chosen, the oldest one is dropped,
 * and an id that is already in the list is removed.
 */
export function toggleCompareId(ids: readonly string[], id: string) {
  if (ids.includes(id)) return ids.filter((candidate) => candidate !== id);

  return [...ids, id].slice(-COMPARE_MAX);
}

export function loadCompareIds(): string[] {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];

    return value.filter((id): id is string => typeof id === "string").slice(0, COMPARE_MAX);
  } catch {
    return [];
  }
}

export function saveCompareIds(ids: readonly string[]) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Blocked storage: the comparison still works through the URL.
  }
}
