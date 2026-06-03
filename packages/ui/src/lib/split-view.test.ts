import { describe, expect, it } from "vitest";
import { isSearchShortcut, splitViewGridClass } from "@reddb-io/ui-kit";

describe("splitViewGridClass", () => {
  it("is responsive (collapses below the container breakpoint) by default", () => {
    const cls = splitViewGridClass();
    expect(cls).toContain("grid-cols-1");
    // Two columns only at/above the container breakpoint.
    expect(cls).toContain("@min-[52rem]:grid-cols-[13rem_minmax(0,1fr)]");
  });

  it("forces a single column when collapsed", () => {
    expect(splitViewGridClass(true)).toBe("grid-cols-1");
  });

  it("forces the two-pane 13rem | minmax(0,1fr) grid when not collapsed", () => {
    expect(splitViewGridClass(false)).toBe("grid-cols-[13rem_minmax(0,1fr)]");
  });
});

describe("isSearchShortcut (Cmd+K idiom)", () => {
  const ev = (init: Partial<KeyboardEvent>) => init as unknown as KeyboardEvent;

  it("matches ⌘K and Ctrl+K", () => {
    expect(isSearchShortcut(ev({ metaKey: true, key: "k" }))).toBe(true);
    expect(isSearchShortcut(ev({ ctrlKey: true, key: "K" }))).toBe(true);
  });

  it("ignores the bare key and other modifiers", () => {
    expect(isSearchShortcut(ev({ key: "k" }))).toBe(false);
    expect(
      isSearchShortcut(ev({ metaKey: true, shiftKey: true, key: "k" }))
    ).toBe(false);
    expect(
      isSearchShortcut(ev({ metaKey: true, altKey: true, key: "k" }))
    ).toBe(false);
    expect(isSearchShortcut(ev({ metaKey: true, key: "j" }))).toBe(false);
  });
});
