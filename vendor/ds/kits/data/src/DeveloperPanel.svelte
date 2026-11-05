<script lang="ts">
  import { Button, Icon, Tabs, warnDeprecated } from "@reddb-io/design-system/base";
  import DeveloperRequestInspector from "./DeveloperRequestInspector.svelte";
  import type { Snippet } from "svelte";
  import type { DeveloperRequest } from "./developer-panel";
  import type { DeveloperPanelContract } from "./core/contracts/developerpanel";
  import { clampDeveloperPanelHeight, developerPanelHeightForKey } from "./developer-panel";
  import { developerPanelClasses as styles } from "./developer-panel.variants";
  export type { DeveloperRequest, RequestPhase } from "./developer-panel";
  interface Props extends DeveloperPanelContract {
    /** Called when the expanded state changes. */
    onopenchange?: (open: boolean) => void;
    /** Legacy callback for clearing the request log.
     * @deprecated Use `contextContent` to compose DeveloperRequestInspector with this handler; removed next release. */
    onrequestschange?: (requests: readonly DeveloperRequest[]) => void;
    /** Caller-owned panel content; the legacy requests prop renders it in the Tools view. */
    children?: Snippet;
    /** Body for a host-defined context, receiving its value. */
    contextContent?: Snippet<[{ value: string }]>;
    /** Optional toolbar below the header for the current context. */
    contextToolbar?: Snippet<[{ value: string }]>;
    /** Legacy actions for the selected request.
     * @deprecated Use `contextContent` to compose DeveloperRequestInspector with these actions; removed next release. */
    requestActions?: Snippet<[DeveloperRequest]>;
    /** Optional header controls before the close button. */
    headerActions?: Snippet;
    /** Extra root classes. */
    class?: string;
  }
  let { label, requests, open = $bindable(false), contained = false, onopenchange, onrequestschange, children: extraTools, contexts = [], contextContent, contextToolbar, toolbarContexts, headerActions, requestActions, class: className = "" }: Props = $props();
  const panelId = $props.id();
  let root = $state<HTMLElement>();
  let maximized = $state(false);
  let resizedHeight = $state<number>();
  let measuredHeight = $state(0);
  let availableHeight = $state(0);
  let drag = $state<{ y: number; height: number }>();
  function available(): number { return contained ? (root?.parentElement?.clientHeight ?? 0) : window.innerHeight; }
  $effect(() => {
    if (!root || !open) return;
    const element = root;
    const update = () => { measuredHeight = element.getBoundingClientRect().height; availableHeight = available(); };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    if (contained && element.parentElement) observer.observe(element.parentElement);
    window.addEventListener("resize", update);
    update();
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  });
  function startResize(event: PointerEvent) {
    if (event.button !== 0 || !root) return;
    event.preventDefault();
    drag = { y: event.clientY, height: root.getBoundingClientRect().height };
    event.currentTarget instanceof HTMLElement && event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveResize(event: PointerEvent) {
    if (drag) resizedHeight = clampDeveloperPanelHeight(drag.height + drag.y - event.clientY, available());
  }
  function resizeKey(event: KeyboardEvent) {
    if (!root) return;
    const next = developerPanelHeightForKey(event.key, root.getBoundingClientRect().height, available());
    if (next !== null) { event.preventDefault(); resizedHeight = next; }
  }
  const hasRequests = $derived(requests !== undefined);
  const entries = $derived(requests ?? []);
  let context = $state("requests");
  const contextItems = $derived([...(hasRequests ? [{ value: "requests", label: "Requests" }] : []), ...contexts.filter((item) => !hasRequests || item.value !== "requests")]);
  $effect(() => { if (hasRequests) warnDeprecated("DeveloperPanel", "requests", "DeveloperRequestInspector inside a Requests context"); });
  function toggle() { open = !open; onopenchange?.(open); }

</script>

{#snippet panelControls()}
  <div class={styles.headerActions}>{@render headerActions?.()}<Button variant="ghost" size="md" class="w-[var(--reddb-spatial-control-height-md)] min-w-[var(--reddb-spatial-control-height-md)] p-0" aria-label={maximized ? "Restore panel size" : "Maximize panel"} title={maximized ? "Restore panel size" : "Maximize panel"} onclick={() => maximized = !maximized}><Icon icon={maximized ? "restore" : "maximize"} size="md" color="current" aria-hidden="true" /></Button><Button variant="ghost" size="lg" class="w-[var(--reddb-spatial-control-height-lg)] min-w-[var(--reddb-spatial-control-height-lg)] p-0" aria-label="Close" title="Close" onclick={toggle}><Icon icon="x" size="md" color="current" aria-hidden="true" /></Button></div>
{/snippet}

<section bind:this={root} id={panelId} aria-label={label} data-developer-panel data-maximized={maximized && open} style:height={!open || resizedHeight === undefined || maximized ? undefined : `${resizedHeight}px`} class={`${styles.root} ${contained ? "absolute max-h-full" : "fixed max-h-[100dvh]"} ${open ? (maximized ? styles.maximized : styles.expanded) : ""} ${className}`}>
  {#if open && !maximized}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex: adjustable ARIA separator -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions: adjustable ARIA separator -->
    <div class={styles.resize} role="separator" tabindex="0" aria-label="Resize developer panel" aria-controls={panelId} aria-orientation="horizontal" aria-valuemin={Math.min(160, Math.round(availableHeight))} aria-valuemax={Math.round(availableHeight)} aria-valuenow={Math.round(measuredHeight)} onpointerdown={startResize} onpointermove={moveResize} onpointerup={() => drag = undefined} onpointercancel={() => drag = undefined} onlostpointercapture={() => drag = undefined} onkeydown={resizeKey}></div>
  {/if}
  {#if !open}
    <div class={styles.toolbar}>
      <Button variant="ghost" size="sm" class="text-body font-medium text-foreground" onclick={toggle} aria-expanded={false}>{label}{hasRequests ? ` · ${entries.length}` : ""}</Button>
    </div>
  {:else if contextItems.length === 0}
    <div class={styles.toolbar}><Button variant="ghost" size="sm" class="text-body font-medium text-foreground" onclick={toggle} aria-expanded={true}>{label}</Button>{@render panelControls()}</div>
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      {#if contextToolbar && (!toolbarContexts || toolbarContexts.includes("content"))}<div class={styles.contextToolbar}>{@render contextToolbar({ value: "content" })}</div>{/if}
      <div class={styles.customBody}>{#if contextContent}{@render contextContent({ value: "content" })}{:else}{@render extraTools?.()}{/if}</div>
    </div>
  {:else}
    <Tabs label="Developer contexts" items={contextItems} triggerClass="text-caption" value={context} onvaluechange={(value) => context = value} class={styles.contexts} listClass="order-last basis-full self-end [&>button]:shrink-0 @lg:order-none @lg:basis-auto" contentClass={styles.contextBody}>
      {#snippet leading()}<Button variant="ghost" size="sm" class="self-center text-body font-medium text-foreground" onclick={toggle} aria-expanded={true}>{label}{hasRequests ? ` · ${entries.length}` : ""}</Button>{/snippet}
      {#snippet actions()}{@render panelControls()}{/snippet}
      {#snippet children({ value: activeContext })}
        {#if contextToolbar && (!toolbarContexts || toolbarContexts.includes(activeContext))}<div class={styles.contextToolbar}>{@render contextToolbar({ value: activeContext })}</div>{/if}
        {#if hasRequests && activeContext === "requests"}
          <div class={styles.customBody}>{#if extraTools}<DeveloperRequestInspector requests={entries} {onrequestschange} {requestActions}>{@render extraTools()}</DeveloperRequestInspector>{:else}<DeveloperRequestInspector requests={entries} {onrequestschange} {requestActions} />{/if}</div>
        {:else}
          <div class={styles.customBody}>{#if contextContent}{@render contextContent({ value: activeContext })}{:else if !hasRequests}{@render extraTools?.()}{/if}</div>
        {/if}
      {/snippet}
    </Tabs>
  {/if}
</section>
