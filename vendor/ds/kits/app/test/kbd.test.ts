// Kbd, as an application meets it.
//
// A chord is the interesting case: the component's whole reason to take a list
// rather than a string is that "Ctrl+K" is two keys, and the DOM it produces
// has to say so — a <kbd> per key, the separator outside them and hidden from
// assistive technology.

import { describe, expect, it } from "vitest";
import Kbd from "../src/primitives/Kbd.svelte";
import { KBD_SIZES, kbd } from "../src/primitives/kbd.variants";
import { classes, classesOf, render, rendered, text } from "./mount";

describe("Kbd", () => {
  it("renders the platform's <kbd>, so a key is announced as a key", () => {
    expect(rendered(render(Kbd, { keys: ["K"] })).tagName).toBe("KBD");
  });

  it("renders a single key with its size's classes", () => {
    for (const size of KBD_SIZES) {
      const element = rendered(render(Kbd, { keys: ["K"], size }));
      const cap = element.querySelector("kbd")!;
      expect(cap.textContent).toBe("K");
      expect(classes(cap)).toEqual(classesOf(kbd({ size })));
    }
  });

  it("renders a chord as one <kbd> per key", () => {
    const element = rendered(render(Kbd, { keys: ["Ctrl", "Shift", "K"] }));
    const caps = [...element.querySelectorAll("kbd")];
    expect(caps.map((cap) => cap.textContent)).toEqual(["Ctrl", "Shift", "K"]);
  });

  it("puts the separator between the keys and hides it from assistive tech", () => {
    const element = rendered(
      render(Kbd, { keys: ["Ctrl", "K"], separator: "then" })
    );
    const separators = [...element.querySelectorAll("[aria-hidden='true']")];
    expect(separators.map((node) => node.textContent)).toEqual(["then"]);
    // Between the keys, never after them: n keys carry n-1 separators. Read
    // off the child order, since the flex gap — not markup whitespace — is
    // what spaces them.
    expect([...element.children].map((child) => child.textContent)).toEqual([
      "Ctrl",
      "then",
      "K",
    ]);
  });

  it("lets a children snippet replace the key list entirely", () => {
    const element = rendered(
      render(Kbd, { keys: ["K"], children: text("any key") })
    );
    expect(element.textContent?.trim()).toBe("any key");
    // The snippet form is a single cap, not a chord wrapper.
    expect(element.querySelectorAll("kbd").length).toBe(0);
    expect(classes(element)).toEqual(classesOf(kbd({ size: "md" })));
  });

  it("renders nothing but the wrapper for an empty chord", () => {
    // An empty list is a caller's data problem, not a crash: better an empty
    // wrapper than a component that throws inside someone's help panel.
    const element = rendered(render(Kbd, { keys: [] }));
    expect(element.querySelectorAll("kbd").length).toBe(0);
    expect(element.textContent).toBe("");
  });

  it("passes native attributes straight through", () => {
    const element = rendered(render(Kbd, { keys: ["K"], id: "shortcut" }));
    expect(element.id).toBe("shortcut");
  });
});
