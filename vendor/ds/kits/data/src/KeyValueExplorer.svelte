<script module lang="ts">
  export type { KvEntry } from "./key-value-explorer";
</script>

<script lang="ts">
  import { Button, Input, quietControl } from "@reddb-io/design-system/base";
  import TreeView from "./TreeView.svelte";
  import {
    filterKvEntries,
    kvTreeNodes,
    kvExpandedIds,
    kvEntryAt,
    materializeKvJson,
    formatValue,
  } from "./key-value-explorer";
  import { explorerClasses as styles } from "./diff-explorer.variants";
  import type { KeyValueExplorerContract } from "./core/contracts/keyvalueexplorer";
  interface Props extends KeyValueExplorerContract {
    /** Extra root classes. */
    class?: string;
  }
  let {
    label,
    entries,
    context,
    emptyLabel = "No keys to inspect.",
    class: className = "",
  }: Props = $props();
  let mode = $state<"tree" | "json">("tree");
  let prefix = $state("");
  let selected = $state<string | null>(null);
  let input = $state<HTMLInputElement>();
  let expanded = $state<readonly string[] | undefined>();
  const filtered = $derived(filterKvEntries(entries, prefix));
  const nodes = $derived(kvTreeNodes(filtered));
  const active = $derived(kvEntryAt(filtered, selected));
  const json = $derived(materializeKvJson(entries, prefix.trim()));
</script>

<section
  data-key-value-explorer
  aria-label={label}
  class={`@container ${styles.root} ${className}`}
>
  <div class={styles.toolbar}>
    {#each ["tree", "json"] as view}<button
        type="button"
        aria-pressed={mode === view}
        class={quietControl({
          selected: mode === view,
          class: "px-[var(--reddb-spatial-inset-sm)]",
        })}
        onclick={() => (mode = view as typeof mode)}
        >{view === "tree" ? "Tree" : "JSON"}</button
      >{/each}
    <label
      >Key prefix <Input
        aria-label="Key prefix"
        bind:value={prefix}
        bind:ref={input}
      /></label
    >
    {#if prefix}<Button
        onclick={() => {
          prefix = "";
          input?.focus();
        }}>Clear prefix</Button
      >{/if}
    <span
      >{filtered.length} of {entries.length} keys{context
        ? ` · ${context}`
        : ""}</span
    >
  </div>
  {#if !entries.length}<p class={styles.detail}>{emptyLabel}</p>
  {:else if !filtered.length}<p class={styles.detail}>No keys match prefix.</p>
  {:else if mode === "json"}<pre class={styles.raw}>{JSON.stringify(
        json,
        null,
        2,
      )}</pre>
  {:else}<div class={styles.content}>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (Named keyboard scroll region.) -->
      <div class={styles.list} role="region" aria-label="Keys" tabindex="0">
        <TreeView
          label="Keys"
          {nodes}
          expanded={expanded ?? kvExpandedIds(nodes)}
          onexpandedchange={(value) => (expanded = value)}
          selected={active ? selected : null}
          onselectedchange={(id) => (selected = id)}
          renamable={false}
          reorderable={false}
        />
      </div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (Named keyboard scroll region.) -->
      <div class={styles.detail} role="region" aria-label="Value" tabindex="0">
        {#if active}<p>{active.key}</p>
          <pre class={styles.value}>{formatValue(active.value)}</pre>{:else}<p>
            Select a key to inspect its value.
          </p>{/if}
      </div>
    </div>{/if}
</section>
