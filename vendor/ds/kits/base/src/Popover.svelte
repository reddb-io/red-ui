<!-- A collision-aware, non-modal anchored dialog with a canonical Button trigger. -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { Popover as Bits } from "bits-ui";
  import Button from "./Button.svelte";
  import type { ButtonSize, ButtonVariant } from "./button.variants";
  import { popover as popoverAppearance } from "./popover.variants";

  type Side = "top" | "right" | "bottom" | "left";
  type Align = "start" | "center" | "end";

  interface Props {
    /** Accessible name for the Button that opens the Popover. */
    triggerLabel: string;
    /** Accessible name for the opened non-modal dialog. */
    contentLabel: string;
    /** Whether the Popover is open. Bindable for controlled consumers. */
    open?: boolean;
    /** Disables the canonical trigger Button. */
    disabled?: boolean;
    /** Button emphasis for the trigger. */
    variant?: ButtonVariant;
    /** Button size for the trigger. */
    size?: ButtonSize;
    /** Preferred side of the trigger; collision handling may flip it. */
    side?: Side;
    /** Preferred alignment along the selected side. */
    align?: Align;
    /** Distance from the trigger in pixels. */
    sideOffset?: number;
    /** Safe distance from viewport collision edges in pixels. */
    collisionPadding?: number;
    /** Optional custom Button content. */
    trigger?: Snippet;
    /** Caller-owned Popover content. */
    children?: Snippet;
    /** Extra classes merged onto the anchored surface. */
    class?: string;
    /** Extra classes merged onto the canonical trigger Button. */
    triggerClass?: string;
    /** Called with the next open state whenever the Popover opens or closes. */
    onopenchange?: (open: boolean) => void;
  }

  let {
    triggerLabel,
    contentLabel,
    open = $bindable(false),
    disabled = false,
    variant = "secondary",
    size = "md",
    side = "bottom",
    align = "start",
    sideOffset = 8,
    collisionPadding = 8,
    trigger,
    children,
    class: className,
    triggerClass,
    onopenchange,
  }: Props = $props();

  const uid = $props.id();
  const contentId = `${uid}-content`;
  let surface: HTMLElement;

  const focusableSelector = [
    "button:not([disabled])",
    "a[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  function handleOpenAutoFocus(event: Event): void {
    event.preventDefault();
    (surface.querySelector<HTMLElement>(focusableSelector) ?? surface).focus();
  }
</script>

<Bits.Root bind:open onOpenChange={onopenchange}>
  <Bits.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        data-popover-trigger
        aria-label={triggerLabel}
        {disabled}
        {variant}
        {size}
        class={triggerClass}
      >
        {#if trigger}{@render trigger()}{:else}{triggerLabel}{/if}
      </Button>
    {/snippet}
  </Bits.Trigger>

  <Bits.Portal>
    <Bits.Content
      id={contentId}
      {side}
      {align}
      {sideOffset}
      avoidCollisions={true}
      {collisionPadding}
      trapFocus={true}
      onOpenAutoFocus={handleOpenAutoFocus}
    >
      {#snippet child({ props, wrapperProps })}
        <div {...wrapperProps}>
          <div
            bind:this={surface}
            {...props}
            id={contentId}
            data-popover-surface
            data-avoid-collisions="true"
            data-collision-padding={collisionPadding}
            role="dialog"
            aria-label={contentLabel}
            class={popoverAppearance({ class: className })}
          >
            {@render children?.()}
          </div>
        </div>
      {/snippet}
    </Bits.Content>
  </Bits.Portal>
</Bits.Root>
