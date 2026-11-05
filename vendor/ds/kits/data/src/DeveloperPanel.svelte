<script lang="ts">
  import { Button, Input, quietControl } from "@reddb-io/design-system/base";
  import type { Snippet } from "svelte";
  import type { DeveloperRequest } from "./developer-panel";
  import type { DeveloperPanelContract } from "./core/contracts/developerpanel";
  import { filterDeveloperRequests, formatRequestDuration, formatRequestDetails } from "./developer-panel";
  import { developerPanelClasses as styles } from "./developer-panel.variants";
  export type { DeveloperRequest, RequestPhase } from "./developer-panel";
  interface Props extends DeveloperPanelContract {
    /** Called when the expanded state changes. */
    onopenchange?: (open: boolean) => void;
    /** Called when the user asks the application to clear the request log. */
    onrequestschange?: (requests: readonly DeveloperRequest[]) => void;
    /** Optional additional tools supplied by the host. */
    children?: Snippet;
    /** Extra root classes. */
    class?: string;
  }
  let { label, requests, open = $bindable(false), contained = false, onopenchange, onrequestschange, children, class: className = "" }: Props = $props();
  let filter = $state("");
  let selected = $state<string | null>(null);
  let copyMessage = $state("");
  let tab = $state<"request" | "response" | "timing" | "tools">("request");
  const filtered = $derived(filterDeveloperRequests([...requests].reverse(), filter));
  const active = $derived(filtered.find((item) => item.id === selected) ?? filtered[0]);
  $effect(() => { void active?.id; void tab; copyMessage = ""; });
  function toggle() { open = !open; onopenchange?.(open); }
  async function copyDetails() {
    if (!active || tab === "tools") return;
    try { await navigator.clipboard.writeText(formatRequestDetails(active, tab)); copyMessage = "Copied."; }
    catch { copyMessage = "Copy failed."; }
  }
</script>

<section aria-label={label} data-developer-panel class={`${styles.root} ${contained ? "absolute" : "fixed"} ${className}`}>
  <div class={styles.toolbar}>
    <Button variant="ghost" size="sm" onclick={toggle} aria-expanded={open}>{label} · {requests.length}</Button>
    {#if open}
      <div class="min-w-0 flex-1"><Input type="search" aria-label="Filter requests" placeholder="Filter requests" bind:value={filter} /></div>
      {#if onrequestschange}<Button variant="ghost" size="sm" onclick={() => onrequestschange?.([])}>Clear requests</Button>{/if}
      <Button variant="ghost" size="sm" onclick={toggle}>Close</Button>
    {/if}
  </div>
  {#if open}
    <div class={styles.content}>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex: scrollable request list is keyboard accessible -->
      <div class={styles.list} role="region" aria-label="Requests" tabindex="0">
        {#if filtered.length === 0}<p class={`${styles.detail} ${styles.muted}`}>{requests.length ? "No requests match the filter." : "No requests recorded."}</p>{/if}
        {#each filtered as item (item.id)}
          <button type="button" class={quietControl({ selected: active?.id === item.id, focus: "inset", class: styles.row })} aria-pressed={active?.id === item.id} onclick={() => selected = item.id}>
            <span>{item.method}</span><span class="min-w-0 flex-1 truncate">{item.target}</span><span>{item.status}</span><span class={styles.muted}>{formatRequestDuration(item.durationMs)}</span>
          </button>
        {/each}
      </div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex: scrollable request details are keyboard accessible -->
      <div class={styles.detail} role="region" aria-label="Request details" tabindex="0">
        <div class={styles.tabs} aria-label="Request views">
          {#each ["request", "response", "timing"] as name}
            <Button variant="ghost" size="sm" aria-pressed={tab === name} class={tab === name ? "border-b-2 border-b-foreground" : "border-b-2 border-b-transparent"} onclick={() => tab = name as typeof tab}>{name === "request" ? "Request" : name === "response" ? "Response" : "Timing"}</Button>
          {/each}
          {#if children}<Button variant="ghost" size="sm" aria-pressed={tab === "tools"} class={tab === "tools" ? "border-b-2 border-b-foreground" : "border-b-2 border-b-transparent"} onclick={() => tab = "tools"}>Tools</Button>{/if}
        </div>
        {#if active && tab !== "tools"}<Button variant="ghost" size="sm" onclick={copyDetails}>Copy details</Button><span role="status">{copyMessage}</span>{/if}
        {#if tab === "tools" && children}
          {@render children()}
        {:else if !active}
          <p class={styles.muted}>Select a request to inspect it.</p>
        {:else if tab === "timing"}
          <div class={styles.stack}>
            <p>Total: {formatRequestDuration(active.durationMs)}</p>
            {#if active.phases?.length}
              <table><caption class="sr-only">Measured phases</caption><thead><tr><th class={styles.cell}>Phase</th><th class={styles.cell}>Start</th><th class={styles.cell}>Duration</th></tr></thead><tbody>{#each active.phases as phase}<tr><th scope="row" class={styles.cell}>{phase.label}</th><td class={styles.cell}>{formatRequestDuration(phase.startMs)}</td><td class={styles.cell}>{formatRequestDuration(phase.durationMs)}</td></tr>{/each}</tbody></table>
            {:else}<p class={styles.muted}>Timing phases not available.</p>{/if}
            {#if active.connection?.length}<div><p class="font-medium">Connection</p><dl>{#each active.connection as [key, value]}<div><dt>{key}</dt><dd class={styles.text}>{value}</dd></div>{/each}</dl></div>{/if}
          </div>
        {:else}
          {@const headers = tab === "request" ? active.requestHeaders : active.responseHeaders}
          {@const body = tab === "request" ? active.requestBody : active.responseBody}
          <div class={styles.stack}>
            <p class={styles.text}>{active.method} {active.target} · {active.status}</p>
            {#if active.error && tab === "response"}<p>{active.error}</p>{/if}
            <div><p class="font-medium">Headers</p>{#if headers?.length}<dl>{#each headers as [key, value]}<div><dt>{key}</dt><dd class={styles.text}>{value}</dd></div>{/each}</dl>{:else}<p class={styles.muted}>Not available.</p>{/if}</div>
            <div><p class="font-medium">Body</p>{#if body !== undefined}<pre class={styles.text}>{body}</pre>{:else}<p class={styles.muted}>Not available.</p>{/if}</div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</section>
