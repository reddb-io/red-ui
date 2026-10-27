<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import Skeleton from "./Skeleton.svelte";
  import EmptyState from "./EmptyState.svelte";
  import Alert from "./Alert.svelte";
  import ScrollArea from "./ScrollArea.svelte";
  import type { ContentStateContract } from "./core/contracts/contentstate";
  import { contentStateSemantics, contentStateHeight } from "./core/content-state";
  import { contentState } from "./content-state.variants";

  interface Props extends ContentStateContract, Omit<HTMLAttributes<HTMLDivElement>, "class" | "children" | "role" | "aria-busy" | "aria-label"> {
    /** Ready content. The application owns its components, data and interactions. */
    children: Snippet;
    /** Optional loading composition instead of the default Skeleton. Keep its children decorative. */
    loading?: Snippet;
    /** Optional empty composition instead of the default EmptyState. */
    empty?: Snippet;
    /** Optional error composition receiving the message; it owns error and retry announcements. */
    failure?: Snippet<[string]>;
    /** Extra classes on the outer region, including caller-owned reserved dimensions. */
    class?: string;
  }
  let { state, label, height, shape = "rectangle", rows = 5, columns = 4, animated = true,
    emptyTitle = "No results", emptyDescription, errorMessage = "Could not load content.", announcement,
    children, loading, empty, failure, class: className, style, ...rest }: Props = $props();
  const semantics = $derived(contentStateSemantics(state, label, emptyTitle, announcement));
  const reserved = $derived(contentStateHeight(height));
  const styles = $derived(contentState({ bounded: reserved !== undefined }));
</script>

{#snippet content()}
  {#if state === "loading"}
    {#if loading}{@render loading()}{:else}<Skeleton {shape} {rows} {columns} {animated} class="h-full max-w-none" style={reserved === undefined ? undefined : "grid-template-rows:none"} />{/if}
  {:else if state === "empty"}
    {#if empty}{@render empty()}{:else}<EmptyState title={emptyTitle} description={emptyDescription} bordered={false} />{/if}
  {:else if state === "error"}
    {#if failure}{@render failure(errorMessage)}{:else}<Alert tone="danger">{errorMessage}</Alert>{/if}
  {:else}
    {@render children()}
  {/if}
{/snippet}

<div {...rest} data-content-state={state} class={styles.root({ class: className })} style={reserved === undefined ? style : `${style ?? ""};height:${reserved}`}>
  <p role="status" aria-live="polite" aria-atomic="true" class={styles.announcement()}>{semantics.message}</p>
  {#if reserved !== undefined}
    <ScrollArea {label} variant="plain" orientation="both" aria-busy={semantics.busy} class={styles.region()} data-content-state-region>
      {@render content()}
    </ScrollArea>
  {:else}
    <div role="region" aria-label={label} aria-busy={semantics.busy} class={styles.region()} data-content-state-region>{@render content()}</div>
  {/if}
</div>
