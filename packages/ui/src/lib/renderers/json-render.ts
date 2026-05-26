// Pure rendering helpers for the JSON capability.
//
// JSON is the universal override — the user can switch any tab to JSON
// to see the raw shape returned by reddb. It is never the default
// renderer (renders() returns false) so it does not steal results from
// the more specific capabilities; it only fires when explicitly chosen.

import type { QueryResult } from '@red-ui/protocol'

export function projectJson(result: QueryResult): unknown {
  // Strip the verbose envelope to what a developer would actually want
  // to inspect: the query, capability, count, and the raw records.
  return {
    query: result.query,
    capability: result.capability,
    record_count: result.record_count,
    records: result.result.records,
  }
}

export function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

export function highlightJson(json: string): string {
  // Tokenize a known-valid JSON string into <span class="…">…</span>
  // segments. Reads "strings (and keys), numbers, booleans, nulls".
  // We deliberately do not parse — this runs over the already-formatted
  // output of JSON.stringify, which is a closed grammar.
  let out = ''
  let i = 0
  const n = json.length
  while (i < n) {
    const ch = json[i]
    if (ch === '"') {
      let j = i + 1
      while (j < n) {
        if (json[j] === '\\') { j += 2; continue }
        if (json[j] === '"') break
        j += 1
      }
      const slice = json.slice(i, j + 1)
      // Look ahead past whitespace for a colon → this is a key.
      let k = j + 1
      while (k < n && (json[k] === ' ' || json[k] === '\t')) k += 1
      const isKey = json[k] === ':'
      out += `<span class="${isKey ? 'k' : 's'}">${escapeHtml(slice)}</span>`
      i = j + 1
      continue
    }
    if ((ch >= '0' && ch <= '9') || (ch === '-' && json[i + 1] >= '0' && json[i + 1] <= '9')) {
      let j = i + 1
      while (j < n && /[0-9eE+\-.]/.test(json[j])) j += 1
      out += `<span class="n">${escapeHtml(json.slice(i, j))}</span>`
      i = j
      continue
    }
    if (json.startsWith('true', i) || json.startsWith('false', i)) {
      const len = json[i] === 't' ? 4 : 5
      out += `<span class="b">${json.slice(i, i + len)}</span>`
      i += len
      continue
    }
    if (json.startsWith('null', i)) {
      out += `<span class="z">null</span>`
      i += 4
      continue
    }
    out += escapeHtml(ch)
    i += 1
  }
  return out
}

export function renderJsonHtml(result: QueryResult): string {
  const payload = projectJson(result)
  const pretty = prettyJson(payload)
  return `<pre class="json">${highlightJson(pretty)}</pre>`
}

function escapeHtml(s: string): string {
  // JSON tokens are wrapped in <span> bodies, never in attribute values,
  // so we leave double-quotes literal — they belong to the JSON syntax
  // and stay readable in the rendered output.
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
