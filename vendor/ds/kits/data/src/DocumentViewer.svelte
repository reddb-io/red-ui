<!-- Dependency-free master-detail browsing for JSON-like documents. -->
<script module lang="ts">
  export {
    documentBody,
    documentFields,
    documentRaw,
    extractDocumentSummary,
    filterDocuments,
    formatDocumentValue,
    visibleDocumentIndex,
    presentDocument,
  } from "./document";
  export type {
    DocumentPresentation,
    DocumentPresenter,
    DocumentField,
    DocumentItem,
    DocumentSummary,
    DocumentValue,
  } from "./document";

  export type { DocumentMode } from "./document";
</script>

<script lang="ts">
  import type { DocumentViewerContract } from "./core/contracts/documentviewer";
  import { Button, Heading, Input, Tabs } from "@reddb-io/design-system/base";
  import { tick, type Snippet } from "svelte";
  import { quietControl, warnDeprecated } from "@reddb-io/design-system/base";
  import {
    filterDocuments,
    presentDocument,
    visibleDocumentIndex,
    type DocumentMode,
    type DocumentItem,
    type DocumentValue,
  } from "./document";

  interface Props extends DocumentViewerContract {
    /** Custom recovery content when no document matches; receives a clear-and-focus action. */
    empty?: Snippet<[{ clear: () => void }]>;
    /** Item activation (ADR 0026's sanctioned `onselect`): the document chosen from the list. */
    onselect?: (document: DocumentValue, index: number) => void;
    /** @deprecated Renamed `onselect` (ADR 0026); removed next release. */
    onSelected?: (document: DocumentValue, index: number) => void;
    /** Reports the detail mode the reader switched to. */
    onmodechange?: (mode: DocumentMode) => void;
    /** @deprecated Renamed `onmodechange` (ADR 0026); removed next release. */
    onMode?: (mode: DocumentMode) => void;
    /**
     * Extra classes, merged onto the root `section` that holds both the list and the detail pane.
     */
    class?: string;
  }

  let {
    documents,
    present = presentDocument,
    label = "Documents",
    selected: controlledSelected,
    onselect,
    onSelected,
    mode: controlledMode,
    onmodechange,
    onMode,
    empty,
    class: className = "",
  }: Props = $props();

  let query = $state("");
  let filterInput = $state<HTMLInputElement>();
  let localSelected = $state<number | null>(0);
  let localMode = $state<DocumentMode>("body");

  const items = $derived(filterDocuments(documents, query, present));
  const activeMode = $derived(controlledMode ?? localMode);
  const activeIndex = $derived(
    visibleDocumentIndex(items, resolveSelectedIndex(controlledSelected === undefined ? localSelected : controlledSelected)),
  );
  const activeDocument = $derived(
    activeIndex === null ? undefined : documents[activeIndex],
  );
  const activePresentation = $derived(activeDocument && activeIndex !== null ? present(activeDocument, activeIndex) : undefined);
  const activeSummary = $derived(activePresentation?.summary);

  function resolveSelectedIndex(selected: number | string | null): number | null {
    if (selected === null) return null;
    if (typeof selected === "number") {
      return selected >= 0 && selected < documents.length ? selected : null;
    }
    const index = documents.findIndex(
      (document, documentIndex) => present(document, documentIndex).summary.id === selected,
    );
    return index < 0 ? null : index;
  }

  function clearFilter(): void {
    query = "";
    void tick().then(() => filterInput?.focus());
  }

  function select(item: DocumentItem): void {
    localSelected = item.index;
    onselect?.(item.document, item.index);
    onSelected?.(item.document, item.index);
  }

  function setMode(mode: DocumentMode): void {
    localMode = mode;
    onmodechange?.(mode);
    onMode?.(mode);
  }

  $effect(() => {
    if (onSelected) warnDeprecated("DocumentViewer", "onSelected", "onselect");
    if (onMode) warnDeprecated("DocumentViewer", "onMode", "onmodechange");
  });

  const modes: readonly { value: DocumentMode; label: string }[] = [
    { value: "body", label: "Body" },
    { value: "fields", label: "Fields" },
    { value: "raw", label: "Raw" },
  ];
</script>

<section
  data-document-viewer
  data-document-mode={activeMode}
  aria-label={label}
  class={`@container/document-viewer min-h-0 w-full overflow-hidden rounded-lg border border-muted bg-transparent text-foreground ${className}`.trim()}
>
  <!-- Container-first (ADR 0021): the list sits beside the detail once the
       viewer itself is 42rem wide, so a narrow pane stacks on any window. -->
  <div data-document-panes class="grid min-h-0 grid-cols-1 @2xl/document-viewer:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
  <div class="min-w-0 border-b border-muted @2xl/document-viewer:border-r">
    <div class="border-b border-muted p-[var(--reddb-spatial-inset-sm)]">
      <Input
        bind:value={query}
        bind:ref={filterInput}
        aria-label="Filter documents"
        type="search"
        placeholder="Filter documents"
        class="w-full"
      />
    </div>

    {#if items.length}
    <div role="listbox" aria-label={`${label} list`} class="max-h-full overflow-y-auto p-[var(--reddb-spatial-inset-sm)]">
      {#each items as item (item.index)}
        <button
          type="button"
          role="option"
          aria-selected={item.index === activeIndex}
          onclick={() => select(item)}
          class={quietControl({
            ink: "foreground",
            selected: item.index === activeIndex,
            class: "block w-full rounded-md px-[var(--reddb-spatial-inset-sm)] py-[var(--reddb-spatial-inset-sm)] text-left",
          })}
        >
          <span class="block font-medium">{item.summary.title}</span>
          {#if item.summary.subtitle}
            <span class="block truncate text-sm text-ink-muted">{item.summary.subtitle}</span>
          {/if}
        </button>
      {/each}
    </div>
    {:else}
        <div data-document-empty class="px-[var(--reddb-spatial-inset-sm)] py-[var(--reddb-spatial-inset-md)] text-sm text-ink-muted">
          {#if empty}{@render empty({ clear: clearFilter })}{:else}
            <p class="m-0">No documents match.</p>
            {#if query}<Button size="sm" onclick={clearFilter}>Clear filter</Button>{/if}
          {/if}
        </div>
    {/if}
  </div>

  <div class="min-w-0">
    <div class="border-b border-muted p-[var(--reddb-spatial-inset-md)]">
      <Heading level={2} role="heading" data-document-title class="m-0 truncate">
        {activeSummary?.title ?? "No document selected"}
      </Heading>
      {#if activeSummary?.subtitle}
        <p class="m-0 truncate text-sm text-ink-muted">{activeSummary.subtitle}</p>
      {/if}
    </div>

    <!-- The Base Tabs own the tab pattern: roving focus, arrow keys, panels. -->
    <Tabs
      label="Document detail mode"
      items={modes}
      value={activeMode}
      onvaluechange={(mode) => setMode(mode as DocumentMode)}
      listClass="px-[var(--reddb-spatial-inset-md)]"
      contentClass="min-w-0 overflow-auto p-[var(--reddb-spatial-inset-md)]"
    >
      {#snippet children({ value })}
        {#if activeDocument}
          {#if value === "body"}
            <div data-document-body class="whitespace-pre-wrap break-words">{activePresentation!.body}</div>
          {:else if value === "fields"}
            <dl class="m-0 grid gap-[var(--reddb-spatial-gap-sm)]">
              {#each activePresentation!.fields as field (field.key)}
                <div data-document-field class="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-[var(--reddb-spatial-gap-md)] border-b border-muted py-[var(--reddb-spatial-inset-sm)]"><dt class="font-medium">{field.key}</dt><dd class="m-0 min-w-0 whitespace-pre-wrap break-words font-mono text-sm">{field.text}</dd></div>
              {/each}
            </dl>
          {:else}
            <pre data-document-raw class="m-0 min-w-max whitespace-pre font-mono text-sm">{activePresentation!.raw}</pre>
          {/if}
        {:else}
          <p class="m-0 text-ink-muted">Select a document to inspect it.</p>
        {/if}
      {/snippet}
    </Tabs>
  </div>
  </div>
</section>
