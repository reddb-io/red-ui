// Badge, as an application meets it.

import { describe, expect, it } from "vitest";
import Badge from "../src/primitives/Badge.svelte";
import { BADGE_VARIANTS, badge } from "../src/primitives/badge.variants";
import { classes, classesOf, render, rendered, text } from "./mount";

describe("Badge", () => {
  it("renders a <span>, so it can sit inside running text", () => {
    expect(rendered(render(Badge, {})).tagName).toBe("SPAN");
  });

  it("renders its children", () => {
    const element = rendered(render(Badge, { children: text("beta") }));
    expect(element.textContent?.trim()).toBe("beta");
  });

  it("wears exactly the classes its variants module produces", () => {
    for (const variant of BADGE_VARIANTS) {
      const element = rendered(render(Badge, { variant }));
      expect(classes(element)).toEqual(classesOf(badge({ variant })));
    }
  });

  it("defaults to the neutral variant", () => {
    expect(classes(rendered(render(Badge, {})))).toEqual(
      classesOf(badge({ variant: "neutral" }))
    );
  });

  it("merges a caller's classes over its own", () => {
    const element = rendered(render(Badge, { class: "uppercase" }));
    expect(classes(element).has("uppercase")).toBe(true);
    expect(classes(element).has("rounded-md")).toBe(true);
  });

  it("passes native attributes straight through", () => {
    const element = rendered(
      render(Badge, { title: "Release stage", id: "stage" })
    );
    expect(element.getAttribute("title")).toBe("Release stage");
    expect(element.id).toBe("stage");
  });
});
