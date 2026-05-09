const STORAGE_KEY = "agentsla:slaIds";

export function loadIds(): `0x${string}`[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is `0x${string}` =>
        typeof x === "string" && x.startsWith("0x") && x.length === 66,
    );
  } catch {
    return [];
  }
}

export function saveIds(ids: `0x${string}`[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}
