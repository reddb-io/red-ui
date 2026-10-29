import type { CodeToken, CodeTokenizer } from "../code-block.variants";

/** Highlight JSON without changing its source; unmatched text stays literal. */
export const jsonCodeGrammar: CodeTokenizer = {
  tokenize(source: string): readonly CodeToken[] {
    const tokens: CodeToken[] = [];
    const pattern = /"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g;
    let offset = 0;
    for (const match of source.matchAll(pattern)) {
      const start = match.index;
      if (start > offset) tokens.push({ kind: "text", value: source.slice(offset, start) });
      const value = match[0];
      const kind = value.startsWith('"')
        ? /^\s*:/.test(source.slice(start + value.length)) ? "keyword" : "string"
        : value === "null" ? "comment" : value === "true" || value === "false" ? "keyword" : "number";
      tokens.push({ kind, value });
      offset = start + value.length;
    }
    if (offset < source.length) tokens.push({ kind: "text", value: source.slice(offset) });
    return tokens;
  },
};
