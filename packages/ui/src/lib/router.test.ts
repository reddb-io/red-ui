import { describe, expect, it, vi } from "vitest";
import {
  createStateRouter,
  pathToLocation,
  targetToHref,
  targetToLocation,
  type RouteTarget,
} from "./router.svelte";

describe("targetToHref", () => {
  it("maps the bare views to their canonical paths", () => {
    expect(targetToHref({ view: "query" })).toBe("/query");
    expect(targetToHref({ view: "collections" })).toBe("/collections");
    expect(targetToHref({ view: "cluster" })).toBe("/cluster");
    expect(targetToHref({ view: "security" })).toBe("/security");
    expect(targetToHref({ view: "settings" })).toBe("/settings");
  });

  it("maps a collection target to its collection-page href", () => {
    expect(
      targetToHref({
        view: "collection",
        collection: "users",
        subpage: "table",
      })
    ).toBe("/c/users/p/table");
  });
});

describe("targetToLocation", () => {
  it("flattens a collection target into the collections view", () => {
    expect(
      targetToLocation({
        view: "collection",
        collection: "users",
        subpage: "graph",
      })
    ).toEqual({ view: "collections", collection: "users", subpage: "graph" });
  });

  it("clears collection/subpage for bare views", () => {
    expect(targetToLocation({ view: "cluster" })).toEqual({
      view: "cluster",
      collection: null,
      subpage: null,
    });
  });
});

describe("pathToLocation", () => {
  it("recognises the top-level views", () => {
    expect(pathToLocation("/query")).toMatchObject({ view: "query" });
    expect(pathToLocation("/cluster")).toMatchObject({ view: "cluster" });
    expect(pathToLocation("/security")).toMatchObject({ view: "security" });
    expect(pathToLocation("/settings")).toMatchObject({ view: "settings" });
  });

  it("decodes collection and subpage from a /c/<name>/p/<subpage> path", () => {
    expect(pathToLocation("/c/my%20coll/p/graph")).toEqual({
      view: "collections",
      collection: "my coll",
      subpage: "graph",
    });
  });

  it("treats a bare /c/<name> path as a collection with no subpage", () => {
    expect(pathToLocation("/c/users")).toEqual({
      view: "collections",
      collection: "users",
      subpage: null,
    });
  });

  it("falls back to the collections workspace for / and unknown paths", () => {
    expect(pathToLocation("/")).toEqual({
      view: "collections",
      collection: null,
      subpage: null,
    });
    expect(pathToLocation("/collections")).toEqual({
      view: "collections",
      collection: null,
      subpage: null,
    });
  });
});

describe("createStateRouter", () => {
  it("starts at the collections workspace by default", () => {
    const r = createStateRouter();
    expect(r.view).toBe("collections");
    expect(r.collection).toBeNull();
    expect(r.subpage).toBeNull();
  });

  it("honours an initial location", () => {
    const r = createStateRouter({
      view: "cluster",
      collection: null,
      subpage: null,
    });
    expect(r.view).toBe("cluster");
  });

  it("navigates between views purely in memory", () => {
    // Standalone embedding guarantee (ADR-0001): the state router resolves
    // navigation against in-memory state alone. It runs in a `node` test
    // environment with no `window`/`history` — that it navigates here at all
    // is the proof it never reaches for the browser URL.
    expect(typeof globalThis.window).toBe("undefined");
    const r = createStateRouter();
    r.go({ view: "security" });
    expect(r.view).toBe("security");
    r.go({ view: "collection", collection: "users", subpage: "table" });
    expect(r.view).toBe("collections");
    expect(r.collection).toBe("users");
    expect(r.subpage).toBe("table");
  });

  it("suppresses the anchor default when navigating from a click", () => {
    const r = createStateRouter();
    const event = { preventDefault: vi.fn() } as unknown as Event;
    r.go({ view: "query" }, event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(r.view).toBe("query");
  });

  it("reports a canonical path that mirrors the current location", () => {
    const r = createStateRouter();
    r.go({ view: "cluster" });
    expect(r.path).toBe("/cluster");
    r.go({ view: "collection", collection: "users", subpage: "graph" });
    expect(r.path).toBe("/c/users/p/graph");
  });
});
