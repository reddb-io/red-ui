import { describe, expect, it } from "vitest";
import { collectionPageHref, rendererSelection } from "./collection-pages";

describe("collection page href", () => {
  it("supports both model-neutral and explicit renderer routes", () => {
    expect(collectionPageHref("event.log")).toBe("/c/event.log");
    expect(collectionPageHref("event.log", "json")).toBe(
      "/c/event.log/p/json"
    );
  });
});

describe("collection renderer selection", () => {
  it("honors a JSON route even for nonempty results, while an explicit override wins", () => {
    expect(rendererSelection("json", undefined, undefined)).toBe("json");
    expect(rendererSelection("json", "table", undefined)).toBe("table");
  });
  it("retains empty-result fallback and automatic shape detection on other routes", () => {
    expect(rendererSelection("queue", undefined, "queue")).toBe("queue");
    expect(rendererSelection("table", undefined, undefined)).toBeUndefined();
  });
});
