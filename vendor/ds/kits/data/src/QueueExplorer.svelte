<script lang="ts">
  import { tick } from "svelte";
  import {
    Button,
    Input,
    Textarea,
    EmptyState,
    StateIllustration,
    quietControl,
  } from "@reddb-io/design-system/base";
  import {
    queueEmptyCompact,
    searchEmpty,
  } from "@reddb-io/design-system/base/illustrations";
  import Table from "./Table.svelte";
  import type { TableColumn } from "./table";
  import {
    filterQueueMessages,
    queueSummary,
    queuePayload,
    displayQueueValue,
    queueEventTime,
    queueEmptyReason,
    queueEmptyCopy,
  } from "./queue-explorer";
  import { explorerClasses as styles } from "./diff-explorer.variants";
  import type { QueueExplorerContract } from "./core/contracts/queueexplorer";
  interface Props extends QueueExplorerContract {
    /** Extra root classes. */
    class?: string;
  }
  let {
    label,
    messages,
    events,
    commands = [],
    context,
    error,
    onenqueue,
    class: className = "",
  }: Props = $props();
  let mode = $state("events"),
    filter = $state(""),
    selected = $state<number | null>(null),
    composer = $state(false),
    payload = $state(""),
    busy = $state(false),
    failure = $state<string | null>(null),
    inserted = $state(0),
    input = $state<HTMLInputElement>();
  let root: HTMLElement;
  let controller: AbortController | undefined;
  $effect(() => {
    void context;
    controller?.abort();
    payload = "";
    failure = null;
    busy = false;
    inserted = 0;
    selected = null;
    return () => controller?.abort();
  });
  const filtered = $derived(filterQueueMessages(messages, filter)),
    summary = $derived(queueSummary(messages));
  const ids = $derived(new Set(filtered.map((message) => message.id)));
  const visibleEvents = $derived(
    events.filter((event) => ids.has(event.messageId)),
  );
  const active = $derived(
    filtered.find((message) => message.index === selected),
  );
  const reason = $derived(
    queueEmptyReason(
      messages.length,
      filtered.length,
      visibleEvents.length,
      mode,
    ),
  );
  const rows = $derived(visibleEvents.map((event, id) => ({ ...event, id })));
  const columns: TableColumn[] = [
    { key: "ts", header: "time", format: queueEventTime },
    { key: "collection", header: "source" },
    { key: "op", header: "op" },
    { key: "entityId", header: "entity" },
    { key: "lsn", header: "lsn", align: "end" },
    { key: "after", header: "after", format: displayQueueValue },
  ];
  function clear() {
    filter = "";
    selected = null;
    input?.focus();
  }
  async function choose(next: string) {
    mode = next;
    await tick();
    root
      .querySelector<HTMLButtonElement>(`[data-queue-mode="${next}"]`)
      ?.focus();
  }
  async function enqueue() {
    if (!onenqueue || !payload.trim() || busy) return;
    const task = new AbortController();
    controller = task;
    busy = true;
    failure = null;
    try {
      await onenqueue(queuePayload(payload), task.signal);
      if (task.signal.aborted) return;
      payload = "";
      inserted += 1;
    } catch (cause) {
      if (!task.signal.aborted)
        failure = cause instanceof Error ? cause.message : String(cause);
    } finally {
      if (controller === task && !task.signal.aborted) busy = false;
    }
  }
</script>

<section
  bind:this={root}
  data-queue-explorer
  aria-label={label}
  class={`@container ${styles.root} ${className}`}
>
  {#if error}<p role="alert" class={styles.detail}>{error}</p>{:else}
    <div class={styles.toolbar}>
      {#each ["events", "messages", "commands", "json"] as view}<button
          type="button"
          data-queue-mode={view}
          class={quietControl({
            selected: mode === view,
            class: "px-[var(--reddb-spatial-inset-sm)]",
          })}
          aria-pressed={mode === view}
          onclick={() => (mode = view)}>{view}</button
        >{/each}
      <Button
        disabled={!onenqueue}
        aria-pressed={composer}
        onclick={() => (composer = !composer)}>insert</Button
      >
      <label
        >Filter queue messages <Input
          data-queue-filter
          aria-label="Filter queue messages"
          bind:value={filter}
          bind:ref={input}
        /></label
      >
      {#if filter}<Button onclick={clear}>Clear queue filter</Button>{/if}
      <span
        >{filtered.length} messages · {visibleEvents.length} events · {summary.activeConsumers}
        active consumers{context ? ` · ${context}` : ""}</span
      >
      {#if summary.sources.length}<span>from {summary.sources.join(", ")}</span
        >{/if}{#if summary.dlcs.length}<span>dlc {summary.dlcs.join(", ")}</span
        >{/if}
    </div>
    {#if composer}<form
        class={styles.toolbar}
        onsubmit={(event) => {
          event.preventDefault();
          void enqueue();
        }}
      >
        <label
          >Message payload <Textarea
            aria-label="Message payload"
            bind:value={payload}
          /></label
        ><Button type="submit" disabled={busy || !onenqueue || !payload.trim()}
          >{busy ? "Inserting…" : "Insert message"}</Button
        >{#if failure}<p role="alert">{failure}</p>{:else if inserted}<p
            role="status"
          >
            {inserted} inserted. Refresh the collection to reload messages.
          </p>{/if}
      </form>{/if}
    {#if reason}<div
        data-renderer-empty="queue"
        data-empty-reason={reason}
        class={styles.detail}
      >
        <EmptyState
          title={queueEmptyCopy[reason].title}
          description={queueEmptyCopy[reason].description}
          bordered={false}
        >
          {#snippet media()}<StateIllustration
              art={reason === "filtered" ? searchEmpty : queueEmptyCompact}
              size="md"
            />{/snippet}
          {#snippet actions()}{#if reason === "filtered"}<Button onclick={clear}
                >Clear queue filter</Button
              >{:else if reason === "unsupported"}<Button
                onclick={() => choose("messages")}>View messages</Button
              >{:else if commands.length}<Button
                onclick={() => choose("commands")}>View queue commands</Button
              >{/if}{/snippet}
        </EmptyState>
      </div>
    {:else if mode === "events"}<Table
        caption={context ? `${context} events` : "Queue events"}
        captionHidden
        {columns}
        {rows}
        rowKey="id"
        pageSize={80}
        columnVisibility={false}
      />
    {:else if mode === "commands"}<div class={styles.detail}>
        {#each commands as command (command.query)}<div>
            <p>{command.label} · {command.mutates ? "mutates" : "read-only"}</p>
            <pre class={styles.value}>{command.query}</pre>
            <p>{command.note}</p>
          </div>{:else}<p>No queue commands provided.</p>{/each}
      </div>
    {:else if mode === "json"}<pre class={styles.raw}>{JSON.stringify(
          filtered.map((message) => message.values),
          null,
          2,
        )}</pre>
    {:else}<div class={styles.content}>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (Named keyboard scroll region.) -->
        <div
          class={styles.list}
          role="region"
          aria-label="Messages"
          tabindex="0"
        >
          {#each filtered as message (message.index)}<button
              type="button"
              class={quietControl({
                selected: active?.index === message.index,
                focus: "inset",
                class: styles.row,
              })}
              aria-pressed={active?.index === message.index}
              onclick={() => (selected = message.index)}
              ><span>{message.id}</span><span>{message.state}</span><span
                >{message.consumer ?? ""}</span
              ><span class="min-w-0 truncate"
                >{displayQueueValue(message.message)}</span
              ></button
            >{/each}
        </div>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (Named keyboard scroll region.) -->
        <div
          class={styles.detail}
          role="region"
          aria-label="Message details"
          tabindex="0"
        >
          {#if active}<p>{active.id} · {active.state}</p>
            <p>
              consumer {active.consumer ?? "none"} · dlc {active.dlc ?? "none"}
            </p>
            <pre class={styles.value}>{displayQueueValue(
                active.message,
              )}</pre>{:else}<p>
              Select a message to inspect payload, delivery state, consumer, and
              DLC link.
            </p>{/if}
        </div>
      </div>{/if}
    <div class={styles.toolbar}>
      {#each [...summary.states, ...summary.operations] as [state, count]}<span
          >{state} {count}</span
        >{/each}
    </div>
  {/if}
</section>
