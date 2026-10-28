// RedDB's `ASK` — a grounded natural-language query that retrieves context
// (tables, documents, vectors, graphs, KV) and synthesises an answer with
// inline `[^N]` citations tied to specific sources (ADR 0013, v1 stable).
//
// Pinned against reddb: docs/api/http.md `POST /ai/ask` response shape +
// .red/adr/0013-ask-grounding-citations.md (citation contract).
//
// This is the substrate for the /ask chat (eixo 4): the answer goes in the
// conversation column, sources_flat becomes the visualization column, and the
// citations link one to the other.

export type AskSourceKind =
  | "table"
  | "document"
  | "vector"
  | "graph_node"
  | "graph_edge"
  | "kv";

export interface AskSource {
  kind: AskSourceKind;
  /** `reddb:<collection>/<id>` (+ `#<score>`/`#<edge_id>`/`#<fragment>`). */
  urn: string;
  /** Raw text/JSON view of the retrieved source. */
  content: string;
  /** Retrieval rank score. */
  score?: number;
  // kind-specific extras
  node_label?: string;
  edge_relation?: string;
  version?: string;
}

export interface AskCitation {
  /** 1-based positional index into `sources_flat`. */
  marker: number;
  /** [start, end) character span of the cited claim in `answer`. */
  span: [number, number];
  urn: string;
}

export interface AskValidation {
  ok: boolean;
  warnings: string[];
  errors: string[];
}

export interface AskResponse {
  answer: string;
  sources_flat: AskSource[];
  citations: AskCitation[];
  validation: AskValidation;
  cache_hit?: boolean;
  provider?: string;
  model?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  cost_usd?: number;
  mode?: string;
  retry_count?: number;
}

export interface AskOptions {
  provider?: string;
  model?: string;
  credential?: string;
}

/** A rendered piece of an answer: plain text, or a citation marker chip. */
export type AnswerSegment =
  | { type: "text"; value: string }
  | { type: "cite"; marker: number };

const MARKER_RE = /\[\^(\d+)\]/g;

/**
 * Split an answer into text + citation-marker segments for rendering. `[^N]`
 * becomes a `cite` segment; an escaped `\[^N\]` is emitted as literal text
 * (the backslash dropped), matching the ADR's escape rule. Markers inside
 * fenced code blocks are left as text so we don't turn code into chips.
 */
export function parseAnswerSegments(answer: string): AnswerSegment[] {
  const segments: AnswerSegment[] = [];
  // Mask fenced code blocks so markers inside them are never parsed.
  const codeSpans: Array<[number, number]> = [];
  const fence = /```[\s\S]*?```|`[^`\n]*`/g;
  let fm: RegExpExecArray | null;
  while ((fm = fence.exec(answer)) !== null) {
    codeSpans.push([fm.index, fm.index + fm[0].length]);
  }
  const inCode = (i: number) => codeSpans.some(([s, e]) => i >= s && i < e);

  let last = 0;
  let m: RegExpExecArray | null;
  MARKER_RE.lastIndex = 0;
  while ((m = MARKER_RE.exec(answer)) !== null) {
    const start = m.index;
    const escaped = start > 0 && answer[start - 1] === "\\";
    if (escaped || inCode(start)) continue;
    if (start > last)
      segments.push({ type: "text", value: answer.slice(last, start) });
    segments.push({ type: "cite", marker: Number(m[1]) });
    last = start + m[0].length;
  }
  if (last < answer.length)
    segments.push({ type: "text", value: answer.slice(last) });
  // Render an escaped `\[^N\]` as the literal citation syntax by dropping the
  // backslashes before its brackets.
  return segments.map((seg) =>
    seg.type === "text"
      ? { type: "text", value: seg.value.replace(/\\([[\]])/g, "$1") }
      : seg
  );
}

/** Parse the collection + id out of a `reddb:<collection>/<id>` URN. */
export function parseUrn(
  urn: string
): { collection: string; id: string } | null {
  const m = /^reddb:([^/]+)\/(.+?)(?:#.*)?$/.exec(urn);
  if (!m) return null;
  return { collection: m[1], id: m[2] };
}
