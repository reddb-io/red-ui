import type { TreeNode } from "./tree";
export interface KvEntry {
  key: string;
  value: unknown;
}
export interface KvNode {
  name: string;
  fullKey: string | null;
  value: unknown;
  children: KvNode[];
}
export function buildTree(entries: KvEntry[]): KvNode {
  const root: KvNode = {
    name: "",
    fullKey: null,
    value: undefined,
    children: [],
  };
  for (const entry of entries) {
    const segments = entry.key.split("/").filter((s) => s.length > 0);
    if (segments.length === 0) continue;
    let cursor = root;
    segments.forEach((seg, i) => {
      let child = cursor.children.find((c) => c.name === seg);
      if (!child) {
        child = { name: seg, fullKey: null, value: undefined, children: [] };
        // Insert in sorted order so output is deterministic.
        const idx = cursor.children.findIndex((c) => c.name > seg);
        if (idx < 0) cursor.children.push(child);
        else cursor.children.splice(idx, 0, child);
      }
      if (i === segments.length - 1) {
        child.fullKey = entry.key;
        child.value = entry.value;
      }
      cursor = child;
    });
  }
  return root;
}

export function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Filter preserves source order and accepts partial prefixes. */
export function filterKvEntries(
  entries: readonly KvEntry[],
  prefix: string,
): KvEntry[] {
  const term = prefix.trim();
  return entries.filter((entry) => entry.key.startsWith(term));
}
/** Build structural dictionaries independently from payload objects, including reserved property names. */
export function materializeKvJson(
  entries: readonly KvEntry[],
  prefix: string,
): Record<string, unknown> {
  interface Branch {
    children: Map<string, Branch>;
    present: boolean;
    value?: unknown;
  }
  const branch = (): Branch => ({ children: new Map(), present: false });
  const root = branch();
  for (const entry of entries) {
    if (!entry.key.startsWith(prefix)) continue;
    const segments = entry.key.slice(prefix.length).split("/").filter(Boolean);
    let cursor = root;
    for (const segment of segments) {
      let next = cursor.children.get(segment);
      if (!next) {
        next = branch();
        cursor.children.set(segment, next);
      }
      cursor = next;
    }
    cursor.present = true;
    cursor.value = entry.value;
  }
  const emit = (node: Branch, isRoot = false): unknown => {
    if (!isRoot && !node.children.size && node.present) return node.value;
    const result: Record<string, unknown> = Object.create(null);
    for (const [key, child] of node.children) result[key] = emit(child);
    if (node.present) {
      // Preserve an actual $value child as well as a value on its parent.
      let key = "$value";
      while (Object.hasOwn(result, key)) key = "$" + key;
      result[key] = node.value;
    }
    return result;
  };
  return emit(root, true) as Record<string, unknown>;
}
export function flattenUnderPrefix(
  entries: KvEntry[],
  prefix: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = Object.create(null);
  for (const entry of entries)
    if (entry.key.startsWith(prefix))
      result[entry.key.slice(prefix.length).replace(/^\/+/, "") || "$value"] =
        entry.value;
  return result;
}
export function kvTreeNodes(entries: readonly KvEntry[]): TreeNode[] {
  const convert = (node: KvNode, path: string): TreeNode => {
    const id = path + "/" + node.name;
    return {
      id,
      label: node.name,
      children: node.children.map((child) => convert(child, id)),
    };
  };
  return buildTree([...entries]).children.map((node) => convert(node, ""));
}
export function kvExpandedIds(nodes: readonly TreeNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...kvExpandedIds(node.children)]);
}
export function kvEntryAt(
  entries: readonly KvEntry[],
  id: string | null,
): KvEntry | undefined {
  return [...entries].reverse().find(
    (entry) => "/" + entry.key.split("/").filter(Boolean).join("/") === id,
  );
}

export function renderKvSnapshot(entries: KvEntry[]): string {
  const tree = buildTree(entries);
  const lines: string[] = [];
  lines.push('<section class="kv">');
  lines.push(`<header class="summary">${entries.length} keys</header>`);
  lines.push('<ul class="tree">');
  for (const child of tree.children) {
    walk(child, 0, lines);
  }
  lines.push("</ul>");
  lines.push("</section>");
  return lines.join("");
}

function walk(node: KvNode, depth: number, out: string[]): void {
  const hasValue = node.fullKey !== null;
  const cls = ["node"];
  if (hasValue) cls.push("leaf");
  out.push(`<li class="${cls.join(" ")}" data-depth="${depth}">`);
  out.push(`<span class="seg">${escapeHtml(node.name)}</span>`);
  if (hasValue) {
    out.push(
      `<span class="val">${escapeHtml(truncate(formatValue(node.value)))}</span>`,
    );
  }
  if (node.children.length > 0) {
    out.push('<ul class="children">');
    for (const child of node.children) walk(child, depth + 1, out);
    out.push("</ul>");
  }
  out.push("</li>");
}

function truncate(s: string, max = 80): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
