// LoadingState, as an application meets it.
//
// What is asserted here is mostly what a screen reader gets, because that is
// where a spinner usually fails: the animation says "waiting" to the eye and
// nothing at all to anything else. The label must therefore be in the DOM in
// every configuration — hiding it is a visual choice, never an audible one.
//
// The same reasoning runs the other way for motion. A reader who has asked the
// platform to stop moving things is asking this component too, so the rotation
// is gated on `motion-safe:` and what remains has to still read as waiting.

import { describe, expect, it } from "vitest";
import LoadingState from "../src/primitives/LoadingState.svelte";
import {
  LOADING_STATE_SIZES,
  loadingState,
} from "../src/primitives/loading-state.variants";
import { classes, classesOf, render, rendered } from "./mount";

describe("LoadingState", () => {
  it("announces itself as a status that is busy", () => {
    const element = rendered(render(LoadingState, {}));
    expect(element.getAttribute("role")).toBe("status");
    // Polite: a load that finishes is news, not an interruption.
    expect(element.getAttribute("aria-live")).toBe("polite");
    expect(element.getAttribute("aria-busy")).toBe("true");
  });

  it("says what is being waited for, even when the caller says nothing", () => {
    expect(rendered(render(LoadingState, {})).textContent?.trim()).toBe(
      "Loading…"
    );
    expect(
      rendered(
        render(LoadingState, { label: "Reaching the cluster…" })
      ).textContent?.trim()
    ).toBe("Reaching the cluster…");
  });

  it("keeps the label in the DOM when it is hidden, and only moves it out of sight", () => {
    const element = rendered(
      render(LoadingState, { label: "Reaching…", labelHidden: true })
    );
    const label = element.querySelector("span")!;
    expect(label.textContent).toBe("Reaching…");
    expect(classes(label)).toEqual(
      classesOf(loadingState({ labelHidden: true }).label())
    );
    expect(classes(label).has("sr-only")).toBe(true);
  });

  it("hides the spinner from assistive technology, since the label carries it", () => {
    const spinner = rendered(render(LoadingState, {})).querySelector("svg")!;
    expect(spinner.getAttribute("aria-hidden")).toBe("true");
  });

  it("spins only where motion is welcome", () => {
    // `prefers-reduced-motion: reduce` is a request to stop moving, and the
    // `motion-safe:` modifier is the whole of the guard that honours it. So the
    // unconditional utility has to be ABSENT, not merely accompanied: a class
    // list carrying both would animate for everyone, gate and all.
    for (const size of LOADING_STATE_SIZES) {
      const spinner = rendered(render(LoadingState, { size })).querySelector(
        "svg"
      )!;
      expect(classes(spinner).has("motion-safe:animate-spin")).toBe(true);
      for (const name of classes(spinner)) {
        expect(
          name.startsWith("animate-"),
          `${name} animates regardless of preference`
        ).toBe(false);
      }
    }
  });

  it("still draws a waiting indicator once the rotation is off", () => {
    // What is left when nothing moves has to mean "waiting" on its own: the
    // ring and its arc, the sentence beside them, and the live region that
    // announces it. None of those may be gated on motion.
    const element = rendered(render(LoadingState, {}));
    const spinner = element.querySelector("svg")!;

    expect(spinner.querySelector("circle")).not.toBeNull();
    expect(spinner.querySelector("path")).not.toBeNull();
    for (const shape of spinner.children) {
      for (const name of classes(shape)) {
        expect(
          name.startsWith("motion-safe:"),
          `${name} disappears under reduced motion`
        ).toBe(false);
      }
    }

    // The track is faint under rotation, where movement carries the shape, and
    // stronger without it, where the whole ring is what makes the mark legible.
    expect(
      classes(spinner.querySelector("circle")!).has("motion-reduce:opacity-50")
    ).toBe(true);

    expect(element.querySelector("span")!.textContent).toBe("Loading…");
    expect(element.getAttribute("role")).toBe("status");
  });

  it("paints the spinner through a token, never a stroke value", () => {
    // `stroke-current` inherits the slot's text colour, so the one colour
    // decision is `text-primary` — a token a Theme reassigns.
    const spinner = rendered(render(LoadingState, {})).querySelector("svg")!;
    for (const shape of spinner.children) {
      expect(classes(shape).has("stroke-current")).toBe(true);
      expect(shape.getAttribute("stroke")).toBeNull();
      expect(shape.getAttribute("fill")).toBeNull();
    }
  });

  it("wears exactly the classes its variants module produces", () => {
    for (const size of LOADING_STATE_SIZES) {
      const target = render(LoadingState, { size });
      const element = rendered(target);
      expect(classes(element)).toEqual(
        classesOf(loadingState({ size }).root())
      );
      expect(classes(element.querySelector("svg")!)).toEqual(
        classesOf(loadingState({ size }).spinner())
      );
    }
  });

  it("defaults to the medium size, with its label drawn", () => {
    const element = rendered(render(LoadingState, {}));
    expect(classes(element)).toEqual(
      classesOf(loadingState({ size: "md" }).root())
    );
    expect(classes(element.querySelector("span")!).has("sr-only")).toBe(false);
  });

  it("merges a caller's classes over the root slot's own", () => {
    const element = rendered(render(LoadingState, { class: "w-full" }));
    expect(classes(element).has("w-full")).toBe(true);
    expect(classes(element).has("inline-flex")).toBe(true);
  });

  it("passes native attributes straight through", () => {
    const element = rendered(render(LoadingState, { id: "nodes-loading" }));
    expect(element.id).toBe("nodes-loading");
  });
});
