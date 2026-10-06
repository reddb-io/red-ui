<script lang="ts">
  import type { Snippet } from "svelte";
  import { Button, Popover } from "@reddb-io/design-system/base";
  import type { SpeedDialAction } from "./command-surfaces.behavior";
  import { speedDial, type SpeedDialSize } from "./speed-dial.variants";

  type Side = "top" | "right" | "bottom" | "left";
  type Align = "start" | "center" | "end";

  interface Props {
    /** Accessible name for the trigger Button, and its visible text when no `trigger` is given. */
    triggerLabel: string;
    /** Accessible name for the revealed actions surface. */
    contentLabel: string;
    /** Actions revealed in order; each renders as a button, or as a link when it has an `href`. */
    actions?: readonly SpeedDialAction[];
    /** Whether the actions are revealed: `bind:open` (ADR 0026). */
    open?: boolean;
    /** Called with the new open state whenever the actions are revealed or hidden. */
    onopenchange?: (open: boolean) => void;
    /** Disables the trigger, so the actions cannot be revealed. Defaults to `false`. */
    disabled?: boolean;
    /** Size of the trigger and of the action buttons: `sm`, `md` or `lg`. Defaults to `md`. */
    size?: SpeedDialSize;
    /**
     * Preferred side of the trigger the actions open on; collision handling may flip it. Defaults
     * to `top`.
     */
    side?: Side;
    /** Preferred alignment along the chosen side: `start`, `center` or `end`. Defaults to `end`. */
    align?: Align;
    /** Distance, in pixels, between the trigger and the revealed actions. Defaults to `8`. */
    sideOffset?: number;
    /**
     * Safe distance, in pixels, kept between the actions and the viewport edges. Defaults to `8`.
     */
    collisionPadding?: number;
    /** Custom content for the trigger Button; `triggerLabel` is shown when omitted. */
    trigger?: Snippet;
    /** Extra classes, merged over the content slot's own, onto the revealed actions surface. */
    class?: string;
  }

  let {
    triggerLabel,
    contentLabel,
    actions = [],
    open = $bindable(false),
    onopenchange,
    disabled = false,
    size = "md",
    side = "top",
    align = "end",
    sideOffset = 8,
    collisionPadding = 8,
    trigger,
    class: className,
  }: Props = $props();

  const slots = $derived(speedDial({ size }));
</script>

<div data-speed-dial>
  <Popover
    {triggerLabel}
    {contentLabel}
    bind:open
    {onopenchange}
    {disabled}
    variant="primary"
    {size}
    {side}
    {align}
    {sideOffset}
    {collisionPadding}
    {trigger}
    class={slots.content({ class: className })}
  >
    {#each actions as action (action.id)}
      <Button
        data-speed-dial-action
        href={action.href}
        disabled={action.disabled}
        variant="ghost"
        {size}
        class={slots.action()}
        onclick={action.href === undefined ? () => action.onselect?.() : undefined}
      >{action.label}</Button>
    {/each}
  </Popover>
</div>
