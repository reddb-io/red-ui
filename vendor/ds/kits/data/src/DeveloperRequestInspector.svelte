<script lang="ts">
  import { Badge, Button, DescriptionList, Input, Tabs } from "@reddb-io/design-system/base";
  import { ListRow, Toolbar } from "@reddb-io/design-system/app";
  import type { Snippet } from "svelte";
  import type { DeveloperRequest } from "./developer-panel";
  import { filterDeveloperRequests, formatRequestDuration, formatRequestDetails, developerRequestStatusTone } from "./developer-panel";
  import { developerPanelClasses as styles } from "./developer-panel.variants";
  export type { DeveloperRequest, RequestPhase } from "./developer-panel";
  interface Props {
    /** Sanitized request snapshot in chronological order, owned by the host. */
    requests: readonly DeveloperRequest[];
    /** Called when the user asks to clear the request log. */
    onrequestschange?: (requests: readonly DeveloperRequest[]) => void;
    /** Host-owned controls for the selected request. */
    requestActions?: Snippet<[DeveloperRequest]>;
    /** Optional host content in the Tools detail view. */
    children?: Snippet;
  }
  let { requests, onrequestschange, requestActions, children: extraTools }: Props = $props();
  let filter = $state("");
  let selected = $state<string | null>(null);
  let copyMessage = $state("");
  let tab = $state<"request" | "response" | "headers" | "timing" | "tools">("request");
  const tabItems = $derived([{ value: "request", label: "Request" }, { value: "response", label: "Response" }, { value: "headers", label: "Headers" }, { value: "timing", label: "Timing" }, ...(extraTools ? [{ value: "tools", label: "Tools" }] : [])]);
  const filtered = $derived(filterDeveloperRequests([...requests].reverse(), filter));
  const active = $derived(filtered.find((item) => item.id === selected) ?? filtered[0]);
  $effect(() => { void active?.id; void tab; copyMessage = ""; });
  $effect(() => { if (!extraTools && tab === "tools") tab = "request"; });
  function selectTab(value: string) {
    if (value === "request" || value === "response" || value === "headers" || value === "timing" || value === "tools") tab = value;
  }
  async function copyDetails() {
    if (!active || tab === "tools") return;
    try { await navigator.clipboard.writeText(formatRequestDetails(active, tab)); copyMessage = "Copied."; }
    catch { copyMessage = "Copy failed."; }
  }
</script>

    <div class={`${styles.content} h-full`}>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex: scrollable request list is keyboard accessible -->
      <div class={styles.list} role="region" aria-label="Requests" tabindex="0">
        <div class={styles.listToolbar}><Input controlSize="sm" type="search" aria-label="Filter requests" placeholder="Filter requests" bind:value={filter} />{#if onrequestschange}<Button variant="ghost" size="sm" class="shrink-0 whitespace-nowrap" aria-label="Clear requests" onclick={() => onrequestschange?.([])}>Clear</Button>{/if}</div>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex: keyboard scrolling for the request list -->
        <div class={styles.listRows} role="region" aria-label="Request list" tabindex="0">
        {#if filtered.length === 0}<p class={`${styles.detail} ${styles.muted}`}>{requests.length ? "No requests match the filter." : "No requests recorded."}</p>{/if}
        {#each filtered as item (item.id)}
          <ListRow size="sm" selected={active?.id === item.id} aria-pressed={active?.id === item.id} class={`${styles.row} py-0`} onclick={() => selected = item.id}>
            {#snippet leading()}<span class="flex items-center gap-[var(--reddb-spatial-gap-sm)]">{#if item.timeLabel}<span class={`${styles.muted} max-w-[10ch] shrink-0 truncate`} title={item.timeLabel}>{item.timeLabel}</span>{/if}{#if item.source}<span class={`${styles.muted} max-w-[8ch] shrink-0 truncate`} title={item.source}>{item.source}</span>{/if}</span>{/snippet}
            {#snippet children()}<span class="flex min-w-0 items-center gap-[var(--reddb-spatial-gap-sm)]"><span class="shrink-0">{item.method}</span><span class="min-w-0 truncate">{item.target}</span></span>{/snippet}
            {#snippet trailing()}<Badge tone={developerRequestStatusTone(item.status)}>{item.status}</Badge><span class={styles.muted}>{formatRequestDuration(item.durationMs)}</span>{/snippet}
          </ListRow>
        {/each}
        </div>
      </div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex: scrollable request details are keyboard accessible -->
      <div class={styles.detail} role="region" aria-label="Request details" tabindex="0">
        {#if active}<div data-developer-request-summary class={styles.summary}><span>{active.method}</span><span class={styles.summaryTarget} title={active.target}>{active.target}</span><Badge tone={developerRequestStatusTone(active.status)}>{active.status}</Badge><span class={styles.muted}>{formatRequestDuration(active.durationMs)}</span>{#if requestActions}<div class={styles.requestActions}>{@render requestActions(active)}</div>{/if}</div>{/if}
        <Tabs label="Request views" items={tabItems} triggerClass="text-caption" value={tab} onvaluechange={selectTab} class={styles.tabs} contentClass={styles.detailBody}>
          {#snippet actions()}
            {#if active && tab !== "tools"}<Toolbar label="Request actions" size="sm" class={styles.tabActions} items={[{ id: "copy", label: "Copy details", onselect: copyDetails }]} />{/if}
            <span class="sr-only" role="status">{copyMessage}</span>
          {/snippet}
          {#snippet children({ value: panel })}
        {#if panel === "tools" && extraTools}
          {@render extraTools()}
        {:else if !active}
          <p class={styles.muted}>Select a request to inspect it.</p>
        {:else if panel === "headers"}
          <div class={styles.stack}>
            <div><p class="font-medium">Response headers</p>{#if active.responseHeaders?.length}<DescriptionList gap="sm" items={active.responseHeaders.map(([term, detail]) => ({ term, detail }))} />{:else}<p class={styles.muted}>Not available.</p>{/if}</div>
            <div><p class="font-medium">Request headers</p>{#if active.requestHeaders?.length}<DescriptionList gap="sm" items={active.requestHeaders.map(([term, detail]) => ({ term, detail }))} />{:else}<p class={styles.muted}>Not available.</p>{/if}</div>
          </div>
        {:else if panel === "timing"}
          <div class={styles.stack}>
            <p>Total: {formatRequestDuration(active.durationMs)}</p>
            {#if active.phases?.length}
              <table><caption class="sr-only">Measured phases</caption><thead><tr><th class={styles.cell}>Phase</th><th class={styles.cell}>Start</th><th class={styles.cell}>Duration</th></tr></thead><tbody>{#each active.phases as phase}<tr><th scope="row" class={styles.cell}>{phase.label}</th><td class={styles.cell}>{formatRequestDuration(phase.startMs)}</td><td class={styles.cell}>{formatRequestDuration(phase.durationMs)}</td></tr>{/each}</tbody></table>
            {:else}<p class={styles.muted}>Timing phases not available.</p>{/if}
            {#if active.connection?.length}<div><p class="font-medium">Connection</p><DescriptionList gap="sm" items={active.connection.map(([term, detail]) => ({ term, detail }))} /></div>{/if}
          </div>
        {:else}
          {@const headers = panel === "request" ? active.requestHeaders : active.responseHeaders}
          {@const body = panel === "request" ? active.requestBody : active.responseBody}
          <div class={styles.stack}>
            <p class={styles.text}>{active.method} {active.target} · {active.status}</p>
            {#if active.error && panel === "response"}<p>{active.error}</p>{/if}
            <div><p class="font-medium">Headers</p>{#if headers?.length}<DescriptionList gap="sm" items={headers.map(([term, detail]) => ({ term, detail }))} />{:else}<p class={styles.muted}>Not available.</p>{/if}</div>
            <div><p class="font-medium">Body</p>{#if body !== undefined}<pre class={styles.text}>{body}</pre>{:else}<p class={styles.muted}>Not available.</p>{/if}</div>
          </div>
        {/if}
          {/snippet}
        </Tabs>
      </div>
    </div>
