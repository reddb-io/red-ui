<!--
  The application-specific sidebar arrangement: one named complementary
  landmark and one real main landmark. Both contain canonical Base Stacks whose
  rhythm defaults to the Density layout tier (ADR 0024); caller content stays
  the caller's. Without a rail it steps on its own width (ADR 0021); with a
  rail it is the page's chrome and steps on the viewport (see the variants).
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { Stack, type StackGap } from "@reddb-io/design-system/base";
  import { sidebarLayout, type SidebarSide } from "./sidebar-layout.variants";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
    /** Logical edge occupied by the complementary landmark. */
    side?: SidebarSide;
    /** Accessible name that distinguishes this complementary landmark. */
    sidebarLabel?: string;
    /** Id of the canonical main-content focus target. */
    mainId?: string;
    /** Sidebar navigation, filters, or other caller-owned supporting content. */
    sidebar?: Snippet;
    /** Optional compact navigation rail paired with the existing sidebar panel. */
    rail?: Snippet;
    /** Externally bindable visibility of the compact navigation rail. */
    railOpen?: boolean;
    /** Externally bindable visibility of the sidebar panel on mobile. */
    panelOpen?: boolean;
    /** Notifies controlled consumers when the built-in drawer dismissal closes the panel. */
    onpanelopenchange?: (open: boolean) => void;
    /** Primary caller-owned page content. */
    children?: Snippet;
    /** Vertical rhythm inside both landmarks. Defaults to the layout tier's `layout-md`. */
    gap?: StackGap;
    /** Extra classes merged onto the layout's root. */
    class?: string;
  }

  let {
    side = "start",
    sidebarLabel = "Sidebar",
    mainId = "main-content",
    sidebar,
    rail,
    railOpen = $bindable(true),
    panelOpen = $bindable(false),
    onpanelopenchange,
    children,
    gap = "layout-md",
    class: className,
    ...rest
  }: Props = $props();

  const hasRail = $derived(rail !== undefined);
  const slots = $derived(sidebarLayout({ side, rail: hasRail, railOpen, panelOpen }));

  function closePanel(): void {
    if (!panelOpen) return;
    panelOpen = false;
    onpanelopenchange?.(false);
  }

  function handleWindowKeydown(event: KeyboardEvent): void {
    if (hasRail && event.key === "Escape") closePanel();
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#snippet sidebarRegion()}
  <aside
    aria-label={sidebarLabel}
    class={hasRail ? slots.panel() : slots.region({ class: slots.sidebar() })}
    data-sidebar-layout-region="sidebar"
    data-mobile-presentation={hasRail ? "drawer" : undefined}
    data-state={hasRail ? (panelOpen ? "open" : "closed") : undefined}
  >
    <Stack {gap}>{@render sidebar?.()}</Stack>
  </aside>
{/snippet}

{#snippet railRegion()}
  <div class={slots.railRegion()} data-sidebar-layout-region="rail" hidden={!railOpen}>
    {@render rail?.()}
  </div>
{/snippet}

{#snippet drawerBackdrop()}
  <!-- Viewport-fixed drawer chrome (rail layout only): its `md:` step is the
       page chrome's, the one place ADR 0021 lets a Kit query the viewport. -->
  {#if hasRail && panelOpen}
    <button
      type="button"
      aria-label="Close sidebar panel"
      data-sidebar-drawer-backdrop
      class="fixed inset-0 z-30 bg-foreground/20 md:hidden"
      onclick={closePanel}
    ></button>
  {/if}
{/snippet}

{#snippet mainRegion()}
  <main
    id={mainId}
    tabindex="-1"
    class={hasRail ? slots.main() : slots.region({ class: slots.content() })}
    data-sidebar-layout-region="main"
  >
    <Stack {gap}>{@render children?.()}</Stack>
  </main>
{/snippet}

<div
  {...(rest as Record<string, unknown>)}
  data-sidebar-layout
  data-side={side}
  data-sidebar-layout-mode={hasRail ? "rail-panel" : "panel"}
  data-rail-open={hasRail ? railOpen : undefined}
  data-panel-open={hasRail ? panelOpen : undefined}
  class={slots.root({ class: className })}
>
  {#if side === "start"}
    {#if hasRail}{@render railRegion()}{/if}
    {@render drawerBackdrop()}
    {@render sidebarRegion()}
    {@render mainRegion()}
  {:else}
    {@render mainRegion()}
    {@render sidebarRegion()}
    {@render drawerBackdrop()}
    {#if hasRail}{@render railRegion()}{/if}
  {/if}
</div>
