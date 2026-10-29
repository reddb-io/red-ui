/** Pure extraction and filtering for the dependency-free Document viewer. */

export type DocumentValue = Readonly<Record<string, unknown>>;

export interface DocumentSummary {
  id: string;
  title: string;
  subtitle: string;
}

export interface DocumentItem {
  document: DocumentValue;
  index: number;
  summary: DocumentSummary;
}

export interface DocumentField {
  key: string;
  value: unknown;
  text: string;
}

/** Caller-supplied document views keep domain-specific representation outside the Kit. */
export interface DocumentPresentation {
  summary: DocumentSummary;
  body: string;
  fields: readonly DocumentField[];
  raw: string;
  /** Optional searchable content; title and subtitle are always included. */
  searchText?: string;
}
export type DocumentPresenter = (document: DocumentValue, index: number) => DocumentPresentation;

const TITLE_FIELDS = ["title", "name", "label", "subject"] as const;
const SUBTITLE_FIELDS = ["subtitle", "description", "summary"] as const;
const BODY_FIELDS = ["body", "content", "text", "markdown"] as const;
const ID_FIELDS = ["id", "_id", "key"] as const;

function scalarText(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return undefined;
}

function firstText(
  document: DocumentValue,
  fields: readonly string[],
): string | undefined {
  for (const field of fields) {
    const text = scalarText(document[field]);
    if (text !== undefined) return text;
  }
  return undefined;
}

function preview(value: string, limit = 120): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= limit ? compact : `${compact.slice(0, limit - 1).trimEnd()}…`;
}

/** Extract stable master-list identity and display text from common document fields. */
export function extractDocumentSummary(
  document: DocumentValue,
  index: number,
): DocumentSummary {
  const id = firstText(document, ID_FIELDS) ?? String(index);
  const title = firstText(document, TITLE_FIELDS) ?? `Document ${index + 1}`;
  const subtitle = firstText(document, SUBTITLE_FIELDS)
    ?? firstText(document, BODY_FIELDS)
    ?? "";
  return { id, title, subtitle: preview(subtitle) };
}

/** Stable, dependency-free presentation for field and raw modes. */
export function formatDocumentValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (typeof value === "bigint") return `${value}n`;
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? String(value) : serialized;
  } catch {
    return String(value);
  }
}

/** Select the conventional long-form field shown by body mode. */
export function documentBody(document: DocumentValue): string {
  const body = firstText(document, BODY_FIELDS);
  if (body !== undefined) return body;
  return documentRaw(document);
}

/** Return caller fields in insertion order for the fields detail mode. */
export function documentFields(document: DocumentValue): readonly DocumentField[] {
  return Object.entries(document).map(([key, value]) => ({
    key,
    value,
    text: formatDocumentValue(value),
  }));
}

/** Pretty JSON used by raw mode, with a safe fallback for non-JSON values. */
export function documentRaw(document: DocumentValue): string {
  try {
    return JSON.stringify(document, null, 2) ?? String(document);
  } catch {
    return String(document);
  }
}

/** Default projection for JSON-like documents. */
export function presentDocument(document: DocumentValue, index: number): DocumentPresentation {
  return { summary: extractDocumentSummary(document, index), body: documentBody(document), fields: documentFields(document), raw: documentRaw(document) };
}

/** Filter documents without changing their original indexes or caller-owned values. */
export function filterDocuments(
  documents: readonly DocumentValue[],
  query: string,
  present: DocumentPresenter = presentDocument,
): readonly DocumentItem[] {
  const needle = query.trim().toLocaleLowerCase();
  return documents
    .map((document, index) => ({
      document,
      index,
      // The default list only needs a summary; avoid serializing every raw
      // document before a search or detail view actually needs it.
      presentation: present === presentDocument ? undefined : present(document, index),
    }))
    .map(({ document, index, presentation }) => ({
      document, index, presentation,
      summary: presentation?.summary ?? extractDocumentSummary(document, index),
    }))
    .filter(({ document, summary, presentation }) => {
      if (!needle) return true;
      const searchable = presentation?.searchText ?? (presentation?.fields ?? documentFields(document))
        .map(field => `${field.key} ${field.text}`).join("\n");
      return [summary.title, summary.subtitle, searchable].join("\n").toLocaleLowerCase().includes(needle);
    })
    .map(({ document, index, summary }): DocumentItem => ({ document, index, summary }));
}

/** Master-detail presentation modes shared by native renderers. */
export type DocumentMode = "body" | "fields" | "raw";

/** Resolve selection within filtered results without changing the caller's selection. */
export function visibleDocumentIndex(items: readonly DocumentItem[], selected: number | null): number | null {
  if (selected === null) return null;
  return items.some(item => item.index === selected) ? selected : items[0]?.index ?? null;
}
