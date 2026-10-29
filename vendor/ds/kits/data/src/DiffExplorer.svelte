<script module lang="ts">
  export { explorerFields, filterExplorerEntries, formatExplorerValue, summarizeExplorerEntries } from "./diff-explorer";
  export type { DiffExplorerEntry, DiffExplorerField } from "./diff-explorer";
</script>
<script lang="ts">
  import { Checkbox, Input, quietControl } from "@reddb-io/design-system/base";
  import { explorerFields, filterExplorerEntries, formatExplorerValue, summarizeExplorerEntries } from "./diff-explorer";
  import { explorerClasses as styles } from "./diff-explorer.variants";
  import type { DiffExplorerContract } from "./core/contracts/diffexplorer";
  interface Props extends DiffExplorerContract {
    /** Extra root classes. */
    class?: string;
  }
  let { label, entries, context, emptyLabel = "No changes to inspect.", class: className = "" }: Props = $props();
  let mode = $state<"summary" | "raw">("summary");
  let filter = $state("");
  let filterInput: HTMLInputElement | undefined = $state();
  let selected = $state<string | null>(null);
  let showUnchanged = $state(false);
  const filtered = $derived(filterExplorerEntries(entries, filter));
  const summary = $derived(summarizeExplorerEntries(entries));
  const active = $derived(filtered.find((entry) => entry.id === selected) ?? filtered[0] ?? null);
  const fields = $derived(active ? explorerFields(active) : []);
  const visible = $derived(showUnchanged ? fields : fields.filter((field) => field.status !== "unchanged"));
</script>
<section data-diff-explorer aria-label={label} class={`@container ${styles.root} ${className}`}>
  {#if entries.length === 0}
    <p class={styles.detail}>{emptyLabel}</p>
  {:else}
    <div class={styles.toolbar}>
      <button type="button" class={quietControl({selected: mode === "summary", class: "px-[var(--reddb-spatial-inset-sm)]"})} aria-pressed={mode === "summary"} onclick={() => mode = "summary"}>Diff</button>
      <button type="button" class={quietControl({selected: mode === "raw", class: "px-[var(--reddb-spatial-inset-sm)]"})} aria-pressed={mode === "raw"} onclick={() => mode = "raw"}>Raw</button>
      <label>Filter <Input type="search" aria-label="Filter" bind:value={filter} bind:ref={filterInput} /></label>
      {#if filter}<button type="button" class={quietControl({class: "px-[var(--reddb-spatial-inset-sm)]"})} onclick={() => { filter = ""; filterInput?.focus(); }}>Clear filter</button>{/if}
      {#each summary as [change, count] (change)}<span>{change} {count}</span>{/each}
      {#if context}<span class={styles.muted}>{context}</span>{/if}
    </div>
    {#if filtered.length === 0}
      <p class={styles.detail}>No changes match the filter.</p>
    {:else if mode === "raw"}
      <pre class={styles.raw}>{formatExplorerValue(filtered.map((entry) => entry.raw))}</pre>
    {:else}
      <div class={styles.content}>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (Named scroll region needs keyboard access.) -->
        <div class={styles.list} role="region" aria-label="Changes" tabindex="0">
          {#each filtered as entry (entry.id)}
            <button type="button" class={quietControl({selected: active?.id === entry.id, focus: "inset", class: styles.row})} aria-pressed={active?.id === entry.id} onclick={() => selected = entry.id}>
              <span>{entry.change}</span><span>{entry.entityId ?? entry.id}</span>{#if entry.group}<span class={styles.muted}>{entry.group}</span>{/if}{#if entry.note}<span>{entry.note}</span>{/if}
            </button>
          {/each}
        </div>
        {#if active}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex (Named scroll region needs keyboard access.) -->
          <div class={styles.detail} role="region" aria-label="Change details" tabindex="0">
            <p>{active.change} · {active.entityId ?? active.id}{#if active.group} · {active.group}{/if}</p>
            {#if active.note}<p>{active.note}</p>{/if}
            {#if fields.length > 0}
              <Checkbox label="Show unchanged fields" bind:checked={showUnchanged} />
              <p>{visible.length}/{fields.length} fields</p>
              {#if visible.length === 0}<p>No changed fields in this row.</p>{:else}
                <!-- svelte-ignore a11y_no_noninteractive_tabindex (The table scroll region must be keyboard-accessible.) -->
                <div role="region" aria-label="Field comparison" tabindex="0" class="max-w-full shrink-0 overflow-x-auto">
                  <table class="w-full min-w-max text-left"><caption class="sr-only">Field comparison</caption><thead><tr><th scope="col" class={styles.cell}>Status</th><th scope="col" class={styles.cell}>Field</th><th scope="col" class={styles.cell}>Before</th><th scope="col" class={styles.cell}>After</th></tr></thead>
                    <tbody>{#each visible as field (field.field)}<tr><td class={styles.cell}>{field.status}</td><th scope="row" class={styles.cell}>{field.field}</th><td class={styles.cell}><pre class={styles.value}>{formatExplorerValue(field.before)}</pre></td><td class={styles.cell}><pre class={styles.value}>{formatExplorerValue(field.after)}</pre></td></tr>{/each}</tbody></table>
                </div>
              {/if}
            {/if}
            <p>Full before</p><pre class={styles.value}>{formatExplorerValue(active.before)}</pre>
            <p>Full after</p><pre class={styles.value}>{formatExplorerValue(active.after)}</pre>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</section>
