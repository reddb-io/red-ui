// SectionHeading, as an application meets it.
//
// The claim this component makes is that look and outline depth are separate
// decisions, so the tests take it at its word: every level renders its own
// element, every size wears its own classes, and the two never move together.

import { describe, expect, it } from "vitest";
import SectionHeading from "../src/primitives/SectionHeading.svelte";
import {
  SECTION_HEADING_LEVELS,
  SECTION_HEADING_SIZES,
  sectionHeading,
} from "../src/primitives/section-heading.variants";
import { classes, classesOf, render, rendered, text } from "./mount";

/** The heading element the component rendered, whatever its level. */
function heading(element: HTMLElement): HTMLElement {
  return element.querySelector("h1, h2, h3, h4, h5, h6") as HTMLElement;
}

describe("SectionHeading", () => {
  it("renders the title as a heading", () => {
    const element = rendered(render(SectionHeading, { title: "Primitives" }));
    expect(heading(element).textContent).toBe("Primitives");
  });

  it("defaults to <h2> — never <h1>, which belongs to the page", () => {
    expect(
      heading(rendered(render(SectionHeading, { title: "Primitives" }))).tagName
    ).toBe("H2");
  });

  it("renders the element the level asks for", () => {
    for (const level of SECTION_HEADING_LEVELS) {
      const element = rendered(
        render(SectionHeading, { title: "Primitives", level })
      );
      expect(heading(element).tagName).toBe(`H${level}`);
    }
  });

  it("keeps the visual size independent of the outline level", () => {
    // The same size at two levels, and the same level at two sizes: if look
    // and depth were fused, one of these pairs would have to disagree.
    for (const size of SECTION_HEADING_SIZES) {
      const deep = heading(
        rendered(render(SectionHeading, { title: "T", level: 5, size }))
      );
      const shallow = heading(
        rendered(render(SectionHeading, { title: "T", level: 2, size }))
      );
      expect(classes(deep)).toEqual(classes(shallow));
      expect(classes(deep)).toEqual(
        classesOf(sectionHeading({ size }).title())
      );
    }
  });

  it("renders the description only when given one", () => {
    const withDescription = rendered(
      render(SectionHeading, {
        title: "Primitives",
        description: "Import no other component.",
      })
    );
    expect(withDescription.textContent).toContain("Import no other component.");

    const withoutDescription = rendered(
      render(SectionHeading, { title: "Primitives" })
    );
    expect(withoutDescription.textContent?.trim()).toBe("Primitives");
  });

  it("renders the actions rail only when given one", () => {
    const withActions = rendered(
      render(SectionHeading, { title: "Primitives", actions: text("Add") })
    );
    expect(withActions.textContent).toContain("Add");
    expect(
      [...withActions.children].some(
        (child) => child.className === sectionHeading({}).actions()
      )
    ).toBe(true);

    const withoutActions = rendered(
      render(SectionHeading, { title: "Primitives" })
    );
    expect(withoutActions.children.length).toBe(1);
  });

  it("draws its rule by default and drops it on request", () => {
    const ruled = rendered(render(SectionHeading, { title: "Primitives" }));
    expect(classes(ruled)).toEqual(
      classesOf(sectionHeading({ rule: true }).root())
    );

    const bare = rendered(
      render(SectionHeading, { title: "Primitives", rule: false })
    );
    expect(classes(bare)).toEqual(
      classesOf(sectionHeading({ rule: false }).root())
    );
    expect(classes(bare).has("border-muted")).toBe(false);
  });

  it("merges a caller's classes over the root slot's own", () => {
    const element = rendered(
      render(SectionHeading, { title: "Primitives", class: "mt-8" })
    );
    expect(classes(element).has("mt-8")).toBe(true);
  });

  it("passes native attributes straight through", () => {
    const element = rendered(
      render(SectionHeading, { title: "Primitives", id: "primitives" })
    );
    expect(element.id).toBe("primitives");
  });
});
