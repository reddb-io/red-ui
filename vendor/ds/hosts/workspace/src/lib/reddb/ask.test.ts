import { describe, it, expect } from "vitest";
import { parseAnswerSegments, parseUrn } from "./ask";

describe("parseAnswerSegments", () => {
  it("splits text and citation markers in order", () => {
    expect(
      parseAnswerSegments("The deploy failed[^1] then recovered[^2].")
    ).toEqual([
      { type: "text", value: "The deploy failed" },
      { type: "cite", marker: 1 },
      { type: "text", value: " then recovered" },
      { type: "cite", marker: 2 },
      { type: "text", value: "." },
    ]);
  });

  it("renders an escaped marker as literal citation syntax", () => {
    expect(parseAnswerSegments("Use \\[^1\\] to cite.")).toEqual([
      { type: "text", value: "Use [^1] to cite." },
    ]);
  });

  it("does not turn markers inside code spans into citations", () => {
    const segs = parseAnswerSegments("Run `rate(x[^1])` carefully[^2].");
    expect(segs.filter((s) => s.type === "cite")).toEqual([
      { type: "cite", marker: 2 },
    ]);
  });

  it("returns a single text segment when there are no markers", () => {
    expect(parseAnswerSegments("plain answer")).toEqual([
      { type: "text", value: "plain answer" },
    ]);
  });
});

describe("parseUrn", () => {
  it("extracts collection and id", () => {
    expect(parseUrn("reddb:deploy_events/42")).toEqual({
      collection: "deploy_events",
      id: "42",
    });
  });

  it("strips kind-specific suffixes", () => {
    expect(parseUrn("reddb:vectors/7#0.94")).toEqual({
      collection: "vectors",
      id: "7",
    });
  });

  it("returns null for a non-reddb urn", () => {
    expect(parseUrn("http://example.com")).toBeNull();
  });
});
