import { flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";
import SurfaceControlsConsumer from "./fixtures/SurfaceControlsConsumer.svelte";
import { Swap, swap } from "./fixtures/surface-controls-consumer";
import { button } from "../src/button.variants";
import { toggleButton } from "../src/toggle-button.variants";
import { classes, classesOf, render, rendered } from "./mount";

describe("the Base Swap", () => {
  it("composes ToggleButton and exposes exactly one state at a time", () => {
    const control = rendered(render(SurfaceControlsConsumer)).querySelector<HTMLElement>(
      "[data-swap]",
    )!;

    expect(control.tagName).toBe("BUTTON");
    expect(control.hasAttribute("data-toggle-button")).toBe(true);
    expect(control.getAttribute("aria-label")).toBe("Show deployment detail");
    expect(control.getAttribute("aria-pressed")).toBe("false");
    expect(control.textContent?.trim()).toBe("Summary");

    control.click();
    flushSync();
    expect(control.getAttribute("aria-pressed")).toBe("true");
    expect(control.textContent?.trim()).toBe("Detail");
  });

  it("keeps native keyboard focus and reports the next state", () => {
    const onchange = vi.fn();
    const control = rendered(render(Swap, { label: "Show detail", onchange }));

    control.focus();
    expect(document.activeElement).toBe(control);
    control.click();
    flushSync();
    expect(onchange).toHaveBeenCalledWith(true);
  });

  it("extends canonical pressed appearance without selecting an axis", () => {
    const control = rendered(render(Swap, { label: "Show detail", class: "shrink-0" }));

    expect(classes(control)).toEqual(
      classesOf(
        button({
          variant: "secondary",
          class: toggleButton({ pressed: false, class: swap({ class: "shrink-0" }) }),
        }),
      ),
    );
    expect(control.hasAttribute("data-theme")).toBe(false);
    expect(control.hasAttribute("data-color-scheme")).toBe(false);
    expect(control.hasAttribute("data-density")).toBe(false);
  });
});
