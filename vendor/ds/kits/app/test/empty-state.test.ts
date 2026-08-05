// EmptyState, as an application meets it.
//
// The optional parts are what matter: an empty state with no media, no
// description and no actions must render as three fewer elements rather than
// as empty ones, for the same reason Card renders no empty header — an empty
// slot still takes its gap and its padding, and a caller reading the page
// cannot tell a missing illustration from a broken one.

import { describe, expect, it } from "vitest";
import EmptyState from "../src/primitives/EmptyState.svelte";
import {
  EMPTY_STATE_SIZES,
  emptyState,
} from "../src/primitives/empty-state.variants";
import { classes, classesOf, render, rendered, text } from "./mount";

describe("EmptyState", () => {
  it("renders the title it was given", () => {
    const element = rendered(render(EmptyState, { title: "No nodes yet" }));
    expect(element.textContent?.trim()).toBe("No nodes yet");
    expect(classes(element.querySelector("p")!)).toEqual(
      classesOf(emptyState({}).title())
    );
  });

  it("wears exactly the classes its variants module produces", () => {
    for (const size of EMPTY_STATE_SIZES) {
      for (const bordered of [true, false]) {
        const element = rendered(
          render(EmptyState, { title: "Empty", size, bordered })
        );
        expect(classes(element)).toEqual(
          classesOf(emptyState({ size, bordered }).root())
        );
      }
    }
  });

  it("defaults to the medium size, with its outline drawn", () => {
    expect(classes(rendered(render(EmptyState, { title: "Empty" })))).toEqual(
      classesOf(emptyState({ size: "md", bordered: true }).root())
    );
  });

  it("renders a description under the title, and only when given one", () => {
    const withDescription = rendered(
      render(EmptyState, {
        title: "No nodes yet",
        description: "Join one to see it here.",
      })
    );
    const paragraphs = [...withDescription.querySelectorAll("p")];
    expect(paragraphs.map((paragraph) => paragraph.textContent)).toEqual([
      "No nodes yet",
      "Join one to see it here.",
    ]);

    const withoutDescription = rendered(
      render(EmptyState, { title: "No nodes yet" })
    );
    expect(withoutDescription.querySelectorAll("p").length).toBe(1);
  });

  it("renders the media above the title, hidden from assistive technology", () => {
    const element = rendered(
      render(EmptyState, { title: "No nodes yet", media: text("(icon)") })
    );
    const media = element.firstElementChild!;
    expect(classes(media)).toEqual(classesOf(emptyState({}).media()));
    // The title already says it; announcing the illustration would say it twice.
    expect(media.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders no media or actions slot when there is nothing to put in one", () => {
    const element = rendered(render(EmptyState, { title: "No nodes yet" }));
    for (const child of element.children) {
      expect(classes(child)).not.toEqual(classesOf(emptyState({}).media()));
      expect(classes(child)).not.toEqual(classesOf(emptyState({}).actions()));
    }
  });

  // The one intent adopted from red-ui's duplicate (issue #9's reconciliation):
  // the command or path that would fill the emptiness, shown as what it is.
  it("renders a hint between the description and the actions, as code", () => {
    const element = rendered(
      render(EmptyState, {
        title: "No nodes yet",
        description: "A node appears here as soon as one joins.",
        hint: "reddb node add --name alpha",
        actions: text("Add a node"),
      })
    );
    const hint = element.querySelector("code")!;
    expect(hint).not.toBeNull();
    expect(hint.textContent).toBe("reddb node add --name alpha");
    expect(classes(hint)).toEqual(classesOf(emptyState({}).hint()));

    // Between: a command that reads before the sentence explaining it is a
    // command with no question attached, and one after the actions is one the
    // reader has already walked past.
    const order = [...element.children];
    expect(order.indexOf(hint)).toBeGreaterThan(
      order.indexOf(element.querySelectorAll("p")[1]!)
    );
    expect(order.indexOf(hint)).toBeLessThan(order.length - 1);
  });

  it("renders no hint when there is none, and leaves the description alone", () => {
    const element = rendered(
      render(EmptyState, {
        title: "No nodes yet",
        description: "Nothing here.",
      })
    );
    expect(element.querySelector("code")).toBeNull();
    expect(element.querySelectorAll("p").length).toBe(2);
  });

  it("sizes the hint with the rest of the region", () => {
    for (const size of EMPTY_STATE_SIZES) {
      const element = rendered(
        render(EmptyState, { title: "Empty", size, hint: "reddb --help" })
      );
      expect(classes(element.querySelector("code")!)).toEqual(
        classesOf(emptyState({ size }).hint())
      );
    }
  });

  it("renders the caller's own controls last, and does not supply any", () => {
    // The way out of an empty state is the caller's decision, so the Kit's
    // Button is nowhere in here — which is also what keeps this a Primitive.
    const element = rendered(
      render(EmptyState, { title: "No nodes yet", actions: text("Add a node") })
    );
    const last = element.lastElementChild!;
    expect(classes(last)).toEqual(classesOf(emptyState({}).actions()));
    expect(last.textContent?.trim()).toBe("Add a node");
  });

  it("merges a caller's classes over the root slot's own", () => {
    const element = rendered(
      render(EmptyState, { title: "Empty", class: "max-w-lg" })
    );
    expect(classes(element).has("max-w-lg")).toBe(true);
    expect(classes(element).has("rounded-lg")).toBe(true);
  });

  it("passes native attributes straight through", () => {
    const element = rendered(
      render(EmptyState, { title: "Empty", id: "nodes-empty" })
    );
    expect(element.id).toBe("nodes-empty");
  });
});
