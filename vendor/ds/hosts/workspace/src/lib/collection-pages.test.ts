import { describe, expect, it } from "vitest";
import { rendererSelection } from "./collection-pages";

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
