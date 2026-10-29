import type { TableRow, TableColumn } from "./table";
export interface TableQueryRequest {
  columns: readonly string[];
  limit: number;
}
export function filterTableRows(
  rows: readonly TableRow[],
  filters: Readonly<Record<string, string>>,
): TableRow[] {
  const active = Object.entries(filters).filter(([, term]) => term.trim());
  return rows.filter((row) =>
    active.every(
      ([key, term]) =>
        row[key] != null &&
        String(row[key]).toLowerCase().includes(term.toLowerCase()),
    ),
  );
}
export function explorerTableColumns(
  columns: readonly TableColumn[],
  rows: readonly TableRow[],
): TableColumn[] {
  let key = "__explorer_row_number__";
  while (
    columns.some((column) => column.key === key) ||
    rows.some((row) => key in row)
  )
    key += "_";
  return [
    {
      key,
      header: "#",
      align: "end",
      editable: false,
      format: (_, row) => String(rows.indexOf(row) + 1),
    },
    ...columns,
  ];
}

/** Normalize HTML number input before invoking a host, including blank and non-finite values. */
export function tableQueryRequest(
  columns: readonly string[],
  limit: number,
): TableQueryRequest {
  return {
    columns: [...new Set(columns)],
    limit: Number.isFinite(limit)
      ? Math.max(1, Math.min(1000, Math.floor(limit)))
      : 200,
  };
}

export function renderTableSnapshot(
  columns: readonly { key: string; identity?: string; badge?: string }[],
  rows: readonly TableRow[],
): string {
  const lines: string[] = [];
  lines.push("<table>");
  lines.push("<thead><tr>");
  lines.push('<th class="num">#</th>');
  for (const c of columns) {
    const kind = c.identity;
    const mark = c.badge
      ? `<span class="badge ${c.badge === "sys" ? "sys" : "pk"}">${escapeHtml(c.badge)}</span>`
      : "";
    const cls = kind ? ` class="id ${escapeHtml(kind)}"` : "";
    lines.push(`<th${cls}>${escapeHtml(c.key)}${mark}</th>`);
  }
  lines.push("</tr></thead>");
  lines.push("<tbody>");
  rows.forEach((row, i) => {
    lines.push("<tr>");
    lines.push(`<td class="num">${i + 1}</td>`);
    for (const c of columns) {
      const v = row[c.key];
      const kind = c.identity;
      const cls = kind ? ` class="id ${escapeHtml(kind)}"` : "";
      if (v === null || v === undefined) {
        lines.push(`<td${cls}><span class="null">NULL</span></td>`);
      } else {
        lines.push(
          `<td${cls}><span class="cell">${escapeHtml(truncateTableValue(typeof v === "object" ? JSON.stringify(v) : String(v)))}</span></td>`,
        );
      }
    }
    lines.push("</tr>");
  });
  lines.push("</tbody>");
  lines.push("</table>");
  return lines.join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncateTableValue(value: string): string { return value.length <= 64 ? value : value.slice(0, 63) + "…"; }
