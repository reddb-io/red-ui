<!--
  EmptyState — a Primitive: it imports no other Kit component.

  The action is a snippet, not a Button. Reaching for the Kit's Button here
  would make EmptyState a Composite for the sake of one call site, and it would
  also decide something that is not this component's to decide: whether the way
  out of an empty list is a primary action, a link, or two of them. The caller
  passes the controls; the empty state only says where they go.

  `title` is required and `description` is not, because an empty region with no
  sentence explaining it is the failure mode this component exists to prevent.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { emptyState, type EmptyStateSize } from "./empty-state.variants";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class" | "title"> {
    /** What is empty, in a few words. */
    title: string;
    /** Why it is empty, or what would fill it. */
    description?: string;
    /**
     * The literal thing that would fill it — a command, a path, a config key —
     * drawn as code rather than as another sentence.
     */
    hint?: string;
    /** Defaults to `md`. */
    size?: EmptyStateSize;
    /** Draw the dashed outline around the region. Defaults to true. */
    bordered?: boolean;
    /** An icon or illustration, rendered above the title. */
    media?: Snippet;
    /** The way out — controls the caller owns, rendered below the text. */
    actions?: Snippet;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
  }

  const {
    title,
    description,
    hint,
    size = "md",
    bordered = true,
    media,
    actions,
    class: className,
    ...rest
  }: Props = $props();

  const slots = $derived(emptyState({ size, bordered }));
</script>

<div {...rest} class={slots.root({ class: className })}>
  {#if media}
    <!-- Decorative by default: the title carries the message, so announcing
         the illustration too would only say it twice. -->
    <div class={slots.media()} aria-hidden="true">{@render media()}</div>
  {/if}

  <p class={slots.title()}>{title}</p>
  {#if description}<p class={slots.description()}>{description}</p>{/if}

  <!-- After the sentence that raises the question and before the control that
       answers it: a command shown first has nothing attached to it, and one
       shown last is one the reader has already walked past. -->
  {#if hint}<code class={slots.hint()}>{hint}</code>{/if}

  {#if actions}
    <div class={slots.actions()}>{@render actions()}</div>
  {/if}
</div>
