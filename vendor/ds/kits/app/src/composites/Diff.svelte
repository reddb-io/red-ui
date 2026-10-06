<!-- Change rows whose meaning survives when feedback colours do not. -->
<script module lang="ts">
  /** One aligned comparison row. The consumer owns diff computation. */
  export interface DiffRow {
    /** The line before the change; omit it for a pure addition. */
    before?: string;
    /** The line after the change; omit it for a pure removal. */
    after?: string;
  }
</script>

<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import SplitView from "../primitives/SplitView.svelte";
  import { diff, type DiffMode } from "./diff.variants";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class" | "role"> {
    /** Accessible name for this comparison. */
    label?: string;
    /** Caller-computed lines in display order. */
    rows: readonly DiffRow[];
    /** Unified reading order or aligned resizable panes. */
    mode?: DiffMode;
    /** Visible and accessible name for the old side. */
    beforeLabel?: string;
    /** Visible and accessible name for the new side. */
    afterLabel?: string;
    /** Accessible name for the side-by-side resize control. */
    separatorLabel?: string;
    /** Extra classes merged over the comparison surface. */
    class?: string;
  }

  let {
    label = "Changes",
    rows,
    mode = "inline",
    beforeLabel = "Before",
    afterLabel = "After",
    separatorLabel = "Resize before and after panes",
    class: className,
    ...rest
  }: Props = $props();
  const styles = $derived(diff());
</script>

{#snippet beforePane()}
  <section
    data-diff-pane="before"
    aria-label={beforeLabel}
    class={styles.pane()}
  >
    <div data-diff-pane-heading aria-hidden="true" class={styles.heading()}>{beforeLabel}</div>
    <div role="list" class={styles.lines()}>
      {#each rows as row}
        {#if row.before === undefined}
          <div data-diff-line data-change-kind="empty" aria-hidden="true" class={styles.line({ change: "empty" })}>
            <span data-diff-marker class={styles.marker()}></span><code></code>
          </div>
        {:else if row.before === row.after}
          <div data-diff-line data-change-kind="context" role="listitem" class={styles.line({ change: "context" })}>
            <span data-diff-marker aria-hidden="true" class={styles.marker()}></span><code>{row.before}</code>
          </div>
        {:else}
          <div
            data-diff-line
            data-change-kind="removal"
            role="listitem"
            aria-label={`Removed: ${row.before}`}
            class={styles.line({ change: "removal" })}
          >
            <span data-diff-marker aria-hidden="true" class={styles.marker()}>−</span><code>{row.before}</code>
          </div>
        {/if}
      {/each}
    </div>
  </section>
{/snippet}

{#snippet afterPane()}
  <section
    data-diff-pane="after"
    aria-label={afterLabel}
    class={styles.pane()}
  >
    <div data-diff-pane-heading aria-hidden="true" class={styles.heading()}>{afterLabel}</div>
    <div role="list" class={styles.lines()}>
      {#each rows as row}
        {#if row.after === undefined}
          <div data-diff-line data-change-kind="empty" aria-hidden="true" class={styles.line({ change: "empty" })}>
            <span data-diff-marker class={styles.marker()}></span><code></code>
          </div>
        {:else if row.before === row.after}
          <div data-diff-line data-change-kind="context" role="listitem" class={styles.line({ change: "context" })}>
            <span data-diff-marker aria-hidden="true" class={styles.marker()}></span><code>{row.after}</code>
          </div>
        {:else}
          <div
            data-diff-line
            data-change-kind="addition"
            role="listitem"
            aria-label={`Added: ${row.after}`}
            class={styles.line({ change: "addition" })}
          >
            <span data-diff-marker aria-hidden="true" class={styles.marker()}>+</span><code>{row.after}</code>
          </div>
        {/if}
      {/each}
    </div>
  </section>
{/snippet}

<div
  {...rest}
  data-diff
  data-mode={mode}
  role="region"
  aria-label={label}
  class={styles.root({ class: className })}
>
  {#if mode === "side-by-side"}
    <SplitView
      start={beforePane}
      end={afterPane}
      label={separatorLabel}
      class={styles.split()}
    />
  {:else}
    <div role="list" class={styles.lines()}>
      {#each rows as row}
        {#if row.before !== undefined && row.before === row.after}
          <div data-diff-line data-change-kind="context" role="listitem" class={styles.line({ change: "context" })}>
            <span data-diff-marker aria-hidden="true" class={styles.marker()}></span><code>{row.before}</code>
          </div>
        {:else}
          {#if row.before !== undefined}
            <div
              data-diff-line
              data-change-kind="removal"
              role="listitem"
              aria-label={`Removed: ${row.before}`}
              class={styles.line({ change: "removal" })}
            >
              <span data-diff-marker aria-hidden="true" class={styles.marker()}>−</span><code>{row.before}</code>
            </div>
          {/if}
          {#if row.after !== undefined}
            <div
              data-diff-line
              data-change-kind="addition"
              role="listitem"
              aria-label={`Added: ${row.after}`}
              class={styles.line({ change: "addition" })}
            >
              <span data-diff-marker aria-hidden="true" class={styles.marker()}>+</span><code>{row.after}</code>
            </div>
          {/if}
        {/if}
      {/each}
    </div>
  {/if}
</div>
