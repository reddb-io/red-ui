// Button, as an application meets it.
//
// The assertions are about the contract, not the classes: which element it
// renders, that its classes are exactly what its variants module produces
// (so the wiring cannot drift without the variants moving too), that the
// platform's behavior survives passing through, and that a disabled Button
// really does not fire.

import { describe, expect, it, vi } from "vitest";
import Button from "../src/primitives/Button.svelte";
import {
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  button,
  buttonSpinner,
} from "../src/primitives/button.variants";
import { classes, classesOf, click, render, rendered, text } from "./mount";

describe("Button", () => {
  it("renders a <button> that does not submit its form by accident", () => {
    const element = rendered(render(Button, {}));
    expect(element.tagName).toBe("BUTTON");
    expect(element.getAttribute("type")).toBe("button");
  });

  it("renders its children", () => {
    const element = rendered(render(Button, { children: text("Save") }));
    expect(element.textContent?.trim()).toBe("Save");
  });

  it("wears exactly the classes its variants module produces", () => {
    for (const variant of BUTTON_VARIANTS) {
      for (const size of BUTTON_SIZES) {
        const element = rendered(render(Button, { variant, size }));
        expect(classes(element)).toEqual(classesOf(button({ variant, size })));
      }
    }
  });

  it("defaults to the primary variant at the medium size", () => {
    const element = rendered(render(Button, {}));
    expect(classes(element)).toEqual(
      classesOf(button({ variant: "primary", size: "md" }))
    );
  });

  it("merges a caller's classes over its own", () => {
    const element = rendered(render(Button, { class: "w-full" }));
    expect(classes(element).has("w-full")).toBe(true);
    // The variant's own classes are still there — `class` adds, never replaces.
    expect(classes(element).has("bg-primary")).toBe(true);
  });

  it("passes native attributes and handlers straight through", () => {
    const onclick = vi.fn();
    const element = rendered(
      render(Button, { onclick, type: "submit", "aria-pressed": "true" })
    );
    expect(element.getAttribute("type")).toBe("submit");
    expect(element.getAttribute("aria-pressed")).toBe("true");
    click(element);
    expect(onclick).toHaveBeenCalledTimes(1);
  });

  it("does not fire while disabled", () => {
    const onclick = vi.fn();
    const element = rendered(render(Button, { onclick, disabled: true }));
    expect((element as HTMLButtonElement).disabled).toBe(true);
    click(element);
    expect(onclick).not.toHaveBeenCalled();
  });
});

// The three intents adopted from rio-lair's Button (issue #9's reconciliation):
// a link that looks like a button, a button that is waiting, and one that
// fills its column. Styling stays on the DS side — these are behaviors and an
// axis, not colours.

describe("Button as an anchor", () => {
  it("renders an <a> to wherever `href` points", () => {
    const element = rendered(
      render(Button, { href: "/docs", children: text("Read the guide") })
    );
    expect(element.tagName).toBe("A");
    expect(element.getAttribute("href")).toBe("/docs");
    // A <button>'s default `type` is not an anchor's business, and an anchor
    // that carried one would claim a MIME hint nobody gave it.
    expect(element.hasAttribute("type")).toBe(false);
  });

  it("wears the same classes it would as a <button>", () => {
    // The whole point of anchor-mode: one visual vocabulary, two elements. A
    // consumer forking the component to change one tag is what this replaces.
    for (const variant of BUTTON_VARIANTS) {
      for (const size of BUTTON_SIZES) {
        const anchor = rendered(
          render(Button, { href: "/docs", variant, size })
        );
        expect(classes(anchor)).toEqual(classesOf(button({ variant, size })));
      }
    }
  });

  it("passes an anchor's own attributes straight through", () => {
    const element = rendered(
      render(Button, {
        href: "https://reddb.io",
        target: "_blank",
        rel: "noreferrer",
      })
    );
    expect(element.getAttribute("target")).toBe("_blank");
    expect(element.getAttribute("rel")).toBe("noreferrer");
  });

  it("withholds the destination when it is out of action", () => {
    // The platform gives an <a> no disabled state, so the only honest way to
    // stop one is to take its destination away — which is also what takes it
    // out of the tab order.
    const element = rendered(render(Button, { href: "/docs", disabled: true }));
    expect(element.hasAttribute("href")).toBe(false);
    expect(element.getAttribute("tabindex")).toBe("-1");
    expect(element.getAttribute("aria-disabled")).toBe("true");
  });
});

describe("Button while loading", () => {
  it("is disabled, announces itself as busy, and does not fire", () => {
    const onclick = vi.fn();
    const element = rendered(
      render(Button, { onclick, loading: true, children: text("Save") })
    );
    expect((element as HTMLButtonElement).disabled).toBe(true);
    expect(element.getAttribute("aria-busy")).toBe("true");
    click(element);
    expect(onclick).not.toHaveBeenCalled();
  });

  it("draws a spinner beside the label it keeps", () => {
    const element = rendered(
      render(Button, { loading: true, children: text("Save") })
    );
    const spinner = element.querySelector("svg");
    expect(spinner).not.toBeNull();
    expect(classes(spinner!)).toEqual(
      classesOf(buttonSpinner({ size: "md" }).root())
    );
    // The spinner is a picture of the wait; the label is what the wait is for,
    // so it stays — and the spinner is hidden from anything that reads instead.
    expect(spinner!.getAttribute("aria-hidden")).toBe("true");
    expect(element.textContent).toContain("Save");
  });

  it("sizes the spinner with the button", () => {
    for (const size of BUTTON_SIZES) {
      const element = rendered(render(Button, { loading: true, size }));
      const spinner = element.querySelector("svg")!;
      expect(classes(spinner)).toEqual(
        classesOf(buttonSpinner({ size }).root())
      );
    }
  });

  it("draws the spinner in the button's own colour, never a colour of its own", () => {
    // One spinner serves three variants because it names no colour: its
    // strokes are `current`, so the variant's text colour is the spinner's.
    const element = rendered(
      render(Button, { loading: true, variant: "secondary" })
    );
    const spinner = element.querySelector("svg")!;
    const strokeClasses = [...spinner.querySelectorAll("*")].flatMap((node) => [
      ...classes(node),
    ]);
    expect(strokeClasses).toContain("stroke-current");
    const coloured = [...classes(spinner), ...strokeClasses].filter((name) =>
      /^(text|fill|stroke)-/.test(name)
    );
    expect(coloured.filter((name) => !/-(current|none)$/.test(name))).toEqual(
      []
    );
  });

  it("draws no spinner when it is not loading", () => {
    expect(
      rendered(render(Button, { children: text("Save") })).querySelector("svg")
    ).toBeNull();
  });

  it("takes an anchor out of action too", () => {
    const element = rendered(render(Button, { href: "/docs", loading: true }));
    expect(element.tagName).toBe("A");
    expect(element.hasAttribute("href")).toBe(false);
    expect(element.querySelector("svg")).not.toBeNull();
  });
});

describe("Button as a block", () => {
  it("fills its column when asked, and only then", () => {
    expect(
      classes(rendered(render(Button, { block: true }))).has("w-full")
    ).toBe(true);
    expect(classes(rendered(render(Button, {}))).has("w-full")).toBe(false);
  });

  it("wears exactly the classes its variants module produces, on either element", () => {
    for (const variant of BUTTON_VARIANTS) {
      const asButton = rendered(render(Button, { variant, block: true }));
      expect(classes(asButton)).toEqual(
        classesOf(button({ variant, block: true }))
      );

      const asAnchor = rendered(
        render(Button, { href: "/docs", variant, block: true })
      );
      expect(classes(asAnchor)).toEqual(
        classesOf(button({ variant, block: true }))
      );
    }
  });
});
