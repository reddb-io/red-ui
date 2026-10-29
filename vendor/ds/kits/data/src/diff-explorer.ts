/** A caller-supplied change to inspect. It is independent of a database or transport. */
export interface DiffExplorerEntry {
  /** Stable identity, unique within the current list. */
  id: string;
  /** Human-readable change category, such as added or modified. */
  change: string;
  /** Optional item identity shown in the list and detail. */
  entityId?: string | null;
  /** Optional group or collection containing the item. */
  group?: string | null;
  /** Optional description of the change. */
  note?: string | null;
  /** Earlier item value. */
  before: unknown;
  /** Later item value. */
  after: unknown;
  /** Original caller-supplied record for the raw view. */
  raw: unknown;
}

export interface DiffExplorerField {
  field: string;
  before: unknown;
  after: unknown;
  status: "added" | "removed" | "modified" | "unchanged";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** A readable display of values used by the list, search and raw views. */
export function formatExplorerValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") {
    try { return JSON.stringify(value, null, 2) ?? String(value); }
    catch { return String(value); }
  }
  return String(value);
}

function stableValue(value: unknown): string | undefined {
  if (value === undefined) return "__red_ui_undefined__";
  try {
    return JSON.stringify(isRecord(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);
  } catch { return String(value); }
}

/** Compare top-level fields while preserving absence versus an explicit undefined. */
export function explorerFields(entry: DiffExplorerEntry): DiffExplorerField[] {
  const before = isRecord(entry.before) ? entry.before : {};
  const after = isRecord(entry.after) ? entry.after : {};
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort((a, b) => a.localeCompare(b)).map((field) => {
    const previous = before[field], next = after[field];
    const beforeHas = Object.hasOwn(before, field), afterHas = Object.hasOwn(after, field);
    const status = !beforeHas && afterHas ? "added" : beforeHas && !afterHas ? "removed" : stableValue(previous) === stableValue(next) ? "unchanged" : "modified";
    return { field, before: previous, after: next, status };
  });
}

/** Search the identity, category, group and compared values without mutating the list. */
export function filterExplorerEntries(entries: readonly DiffExplorerEntry[], filter: string): DiffExplorerEntry[] {
  const query = filter.trim().toLowerCase();
  if (!query) return [...entries];
  return entries.filter((entry) => [entry.id, entry.change, entry.group ?? "", entry.entityId ?? "", formatExplorerValue(entry.before), formatExplorerValue(entry.after)].some((value) => value.toLowerCase().includes(query)));
}

/** Count change categories in stable alphabetical order. */
export function summarizeExplorerEntries(entries: readonly DiffExplorerEntry[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.change, (counts.get(entry.change) ?? 0) + 1);
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
}
