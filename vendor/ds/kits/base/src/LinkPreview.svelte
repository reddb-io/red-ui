<!-- A native link with a collision-aware, non-focusable preview surface. -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAnchorAttributes } from "svelte/elements";
  import { LinkPreview as Bits } from "bits-ui";
  import { link } from "./link.variants";
  import { linkPreview as linkPreviewAppearance } from "./link-preview.variants";

  type Side = "top" | "right" | "bottom" | "left";
  type Align = "start" | "center" | "end";

  interface Props
    extends Omit<
      HTMLAnchorAttributes,
      "aria-controls" | "aria-expanded" | "aria-haspopup" | "children" | "class" | "href" | "role"
    > {
    /** Native destination retained whether or not the preview is available. */
    href: string;
    /** Visible fallback link text. */
    label: string;
    /** Accessible name for the preview dialog. */
    previewLabel: string;
    /** Whether the preview is open. Bindable for controlled consumers. */
    open?: boolean;
    /** Called with the next open state (ADR 0026's open dialect). */
    onopenchange?: (open: boolean) => void;
    /** Delay before keyboard focus or pointer hover opens the preview. */
    openDelay?: number;
    /** Delay before leaving the trigger and preview closes it. */
    closeDelay?: number;
    /** Preferred side of the link; collision handling may flip it. */
    side?: Side;
    /** Preferred alignment along the selected side. */
    align?: Align;
    /** Distance from the link in pixels. */
    sideOffset?: number;
    /** Safe distance from viewport collision edges in pixels. */
    collisionPadding?: number;
    /** Optional custom link content. */
    trigger?: Snippet;
    /** Caller-owned preview content. */
    children?: Snippet;
    /** Extra classes merged onto the preview surface. */
    class?: string;
    /** Optional classes for the native link itself. */
    triggerClass?: string;
  }

  let {
    href,
    label,
    previewLabel,
    open = $bindable(false),
    onopenchange,
    openDelay = 700,
    closeDelay = 300,
    side = "top",
    align = "center",
    sideOffset = 8,
    collisionPadding = 8,
    trigger,
    children,
    class: className,
    triggerClass,
    ...rest
  }: Props = $props();

  const uid = $props.id();
  const contentId = `${uid}-content`;
</script>

<Bits.Root bind:open onOpenChange={onopenchange} {openDelay} {closeDelay}>
  <Bits.Trigger>
    {#snippet child({ props })}
      <!-- svelte-ignore a11y_no_redundant_roles (Bits assigns role=button; the override preserves native link semantics.) -->
      <a
        {...(rest as Record<string, unknown>)}
        {...props}
        {href}
        data-link-preview-trigger
        role="link"
        class={link({ class: triggerClass })}
      >
        {#if trigger}{@render trigger()}{:else}{label}{/if}
      </a>
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
    >
      {#snippet child({ props, wrapperProps })}
        <div {...wrapperProps}>
          <div
            {...props}
            id={contentId}
            data-link-preview-surface
            data-avoid-collisions="true"
            data-collision-padding={collisionPadding}
            role="dialog"
            aria-label={previewLabel}
            class={linkPreviewAppearance({ class: className })}
          >
            {@render children?.()}
          </div>
        </div>
      {/snippet}
    </Bits.Content>
  </Bits.Portal>
</Bits.Root>
