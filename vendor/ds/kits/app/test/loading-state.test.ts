// LoadingState, as an application meets it.
//
// What is asserted here is mostly what a screen reader gets, because that is
// where a spinner usually fails: the animation says "waiting" to the eye and
// nothing at all to anything else. The label must therefore be in the DOM in
// every configuration — hiding it is a visual choice, never an audible one.

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
    expect(classes(spinner).has("animate-spin")).toBe(true);
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
