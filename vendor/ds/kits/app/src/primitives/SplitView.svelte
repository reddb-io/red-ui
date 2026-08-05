<!--
  SplitView — a Primitive: it imports no other Kit component. It imports its
  own behavior module, which is a `.ts` file and not a component, so the
  mechanical test in test/primitives.test.ts reads it as what it is.

  Two panes and a divider you can move, by pointer or by keyboard. The
  arithmetic lives in split-view.behavior.ts, where it can be tested without a
  browser; what is left here is the part that genuinely needs a DOM.

  The divider is a real `role="separator"` with a tab stop and value bounds, so
  the split is adjustable without a pointer at all — the failure mode of every
  hand-rolled splitter, and the reason this one is in the Kit rather than in
  each application.

  `fraction` is bindable: an application that wants to persist the split reads
  it, and one that does not can ignore it entirely.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import {
    SPLIT_BOUNDS,
    clampFraction,
    fractionAt,
    fractionForKey,
    percentOf,
    separatorOrientation,
    type SplitOrientation,
  } from "./split-view.behavior";
  import { splitView } from "./split-view.variants";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
    /** Axis the panes are laid out along. Defaults to `horizontal`. */
    orientation?: SplitOrientation;
    /** How much of the container the start pane takes, 0–1. Bindable. */
    fraction?: number;
    /** Smallest fraction the start pane may shrink to. */
    min?: number;
    /** Largest fraction it may grow to. */
    max?: number;
    /** Accessible name for the divider. */
    label?: string;
    /** The leading pane: left, or top. */
    start?: Snippet;
    /** The trailing pane: right, or bottom. */
    end?: Snippet;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
  }

  let {
    orientation = "horizontal",
    fraction = $bindable(0.5),
    min = SPLIT_BOUNDS.min,
    max = SPLIT_BOUNDS.max,
    label = "Resize panes",
    start,
    end,
    class: className,
    ...rest
  }: Props = $props();

  let container: HTMLElement | undefined = $state();
  let dragging = $state(false);

  const bounds = $derived({ min, max });
  const position = $derived(clampFraction(fraction, bounds));
  const slots = $derived(splitView({ orientation, dragging }));

  function grab(event: PointerEvent): void {
    dragging = true;
    // Capture keeps the moves coming once the pointer outruns a divider four
    // pixels wide, which it does immediately. Where there is no pointer
    // capture — jsdom, or a browser declining the id — the drag is the same
    // drag, just bounded by the divider.
    try {
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    } catch {
      /* nothing to capture with; the move handler still runs. */
    }
  }

  function move(event: PointerEvent): void {
    if (!dragging || !container) return;
    const box = container.getBoundingClientRect();
    const next =
      orientation === "horizontal"
        ? fractionAt(event.clientX - box.left, box.width, bounds)
        : fractionAt(event.clientY - box.top, box.height, bounds);
    // A move the container cannot measure leaves the divider alone rather than
    // slamming it to an edge.
    if (next === null) return;
    fraction = next;
  }

  function release(): void {
    dragging = false;
  }

  function key(event: KeyboardEvent): void {
    const next = fractionForKey(event.key, position, orientation, bounds);
    // Every other key — the other axis included — belongs to the page.
    if (next === null) return;
    event.preventDefault();
    fraction = next;
  }
</script>

<div
  bind:this={container}
  {...rest}
  class={slots.root({ class: className })}
  data-orientation={orientation}
>
  <div class={slots.pane()} style="flex-basis: {percentOf(position)}">
    {@render start?.()}
  </div>

  <!-- A focusable separator is the ARIA window splitter: interactive by role,
       which is why it takes a tab stop and its own key handling. Svelte's a11y
       pass reads `separator` as the static kind — the rule between two blocks
       of text — and warns; the value bounds above are what tell it apart, and
       are also what a screen reader announces when it lands here. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class={slots.divider()}
    role="separator"
    tabindex="0"
    aria-label={label}
    aria-orientation={separatorOrientation(orientation)}
    aria-valuenow={Math.round(position * 100)}
    aria-valuemin={Math.round(clampFraction(min, bounds) * 100)}
    aria-valuemax={Math.round(clampFraction(max, bounds) * 100)}
    onpointerdown={grab}
    onpointermove={move}
    onpointerup={release}
    onpointercancel={release}
    onlostpointercapture={release}
    onkeydown={key}
  ></div>

  <div class={slots.pane()} style="flex-basis: {percentOf(1 - position)}">
    {@render end?.()}
  </div>
</div>
