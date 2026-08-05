// Card, as an application meets it.
//
// The sections are what matter here. An absent header must not render, because
// an empty header still draws its rule and its padding — a visible claim that
// the Card has a heading it does not have.

import { describe, expect, it } from "vitest";
import Card from "../src/primitives/Card.svelte";
import {
  CARD_PADDINGS,
  CARD_VARIANTS,
  card,
} from "../src/primitives/card.variants";
import { classes, classesOf, render, rendered, text } from "./mount";

/** The Card's direct children, which are its sections in document order. */
function sections(element: HTMLElement): HTMLElement[] {
  return [...element.children] as HTMLElement[];
}

describe("Card", () => {
  it("renders only a body when given only children", () => {
    const element = rendered(render(Card, { children: text("contents") }));
    expect(sections(element).length).toBe(1);
    expect(element.textContent?.trim()).toBe("contents");
  });

  it("wears exactly the classes its variants module produces", () => {
    for (const variant of CARD_VARIANTS) {
      for (const padding of CARD_PADDINGS) {
        const element = rendered(render(Card, { variant, padding }));
        expect(classes(element)).toEqual(
          classesOf(card({ variant, padding }).root())
        );
      }
    }
  });

  it("defaults to the outline variant at the medium padding", () => {
    expect(classes(rendered(render(Card, {})))).toEqual(
      classesOf(card({ variant: "outline", padding: "md" }).root())
    );
  });

  it("renders a header from a title and a description", () => {
    const element = rendered(
      render(Card, { title: "Tokens", description: "What the Brand ships." })
    );
    const [header] = sections(element);
    expect(classes(header!)).toEqual(classesOf(card({}).header()));
    expect(header!.textContent).toContain("Tokens");
    expect(header!.textContent).toContain("What the Brand ships.");
  });

  it("renders a header from a title alone", () => {
    const element = rendered(render(Card, { title: "Tokens" }));
    expect(sections(element)[0]!.textContent?.trim()).toBe("Tokens");
  });

  it("lets a header snippet win over the title and description", () => {
    const element = rendered(
      render(Card, {
        title: "Tokens",
        description: "ignored",
        header: text("Custom"),
      })
    );
    const [header] = sections(element);
    expect(header!.textContent?.trim()).toBe("Custom");
    expect(element.textContent).not.toContain("ignored");
  });

  it("renders no header at all when there is nothing to put in one", () => {
    const element = rendered(render(Card, { children: text("body") }));
    for (const section of sections(element)) {
      expect(classes(section)).not.toEqual(classesOf(card({}).header()));
    }
  });

  it("renders a footer last, and only when given one", () => {
    const withFooter = rendered(
      render(Card, { children: text("body"), footer: text("Cancel") })
    );
    const last = sections(withFooter).at(-1)!;
    expect(classes(last)).toEqual(classesOf(card({}).footer()));
    expect(last.textContent?.trim()).toBe("Cancel");

    const withoutFooter = rendered(render(Card, { children: text("body") }));
    expect(sections(withoutFooter).length).toBe(1);
  });

  it("orders its sections header, body, footer", () => {
    const element = rendered(
      render(Card, {
        title: "Head",
        children: text("Body"),
        footer: text("Foot"),
      })
    );
    expect(
      sections(element).map((section) => section.textContent?.trim())
    ).toEqual(["Head", "Body", "Foot"]);
  });

  it("merges a caller's classes over the root slot's own", () => {
    const element = rendered(render(Card, { class: "w-96" }));
    expect(classes(element).has("w-96")).toBe(true);
    expect(classes(element).has("rounded-lg")).toBe(true);
  });

  it("passes native attributes straight through", () => {
    const element = rendered(render(Card, { id: "summary", role: "group" }));
    expect(element.id).toBe("summary");
    expect(element.getAttribute("role")).toBe("group");
  });
});
