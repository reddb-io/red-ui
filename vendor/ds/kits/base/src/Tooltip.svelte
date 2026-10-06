<!--
  A supplemental description whose trigger remains meaningful without it.

  By default the Tooltip renders its own ghost trigger named by `label`. Pass
  `child` to decorate an element you already have — an icon Button, a link, a
  table cell — spreading the given props onto it; that element then owns its
  own accessible name.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";
  import { Tooltip as Bits } from "bits-ui";
  import { button } from "./button.variants";
  import { tooltip as tooltipAppearance } from "./tooltip.variants";

  interface Props extends Omit<HTMLButtonAttributes, "aria-describedby" | "aria-label" | "class" | "type"> {
    /**
     * Accessible name of the DS-rendered trigger; it remains complete when the
     * Tooltip is unavailable. Required unless `child` supplies the trigger.
     */
    label?: string;
    /** Supplemental description shown by the Tooltip. */
    content: string;
    /** Trigger content. */
    children?: Snippet;
    /**
     * Render your own trigger: spread `props` onto one focusable element. It
     * receives the Tooltip's event handlers and `aria-describedby`.
     */
    child?: Snippet<[{ props: Record<string, unknown> }]>;
    /** Extra classes merged onto the trigger. */
    class?: string;
  }

  let {
    label,
    content,
    children,
    // The Bits trigger's own snippet is named `child` too; keep ours distinct.
    child: childTrigger,
    class: className,
    onmouseenter,
    onmouseleave,
    ...rest
  }: Props = $props();
  const uid = $props.id();
  const tooltipId = `${uid}-content`;
  let open = $state(false);

  function handleMouseenter(event: MouseEvent): void {
    onmouseenter?.(event as MouseEvent & { currentTarget: EventTarget & HTMLButtonElement });
    open = true;
  }

  function handleMouseleave(event: MouseEvent): void {
    onmouseleave?.(event as MouseEvent & { currentTarget: EventTarget & HTMLButtonElement });
    open = false;
  }
</script>

<span data-tooltip-root class="relative inline-flex">
  <Bits.Provider delayDuration={0}>
    <Bits.Root bind:open delayDuration={0} disabled={Boolean(rest.disabled)}>
      <Bits.Trigger
        {...(rest as Record<string, unknown>)}
        disabled={Boolean(rest.disabled)}
        onmouseenter={handleMouseenter}
        onmouseleave={handleMouseleave}
      >
        {#snippet child({ props })}
          {#if childTrigger}
            {@render childTrigger({ props: { ...props, "data-tooltip-trigger": "" } })}
          {:else}
            <button
              {...props}
              type="button"
              data-tooltip-trigger
              aria-label={label}
              class={button({ variant: "ghost", size: "sm", class: className })}
            >
              {#if children}{@render children()}{:else}{label}{/if}
            </button>
          {/if}
        {/snippet}
      </Bits.Trigger>

      {#if open}
        <Bits.Portal>
          <Bits.Content
            id={tooltipId}
            side="top"
            align="center"
            sideOffset={8}
            avoidCollisions={true}
            collisionPadding={8}
          >
            {#snippet child({ props, wrapperProps })}
              <div {...wrapperProps}>
                <span
                  {...props}
                  id={tooltipId}
                  data-tooltip-surface
                  role="tooltip"
                  class={tooltipAppearance()}
                >{content}</span>
              </div>
            {/snippet}
          </Bits.Content>
        </Bits.Portal>
      {/if}
    </Bits.Root>
  </Bits.Provider>
</span>
