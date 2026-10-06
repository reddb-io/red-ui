<!-- The one title at the root of an application page's document outline. -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { Heading, Stack } from "@reddb-io/design-system/base";
  import { pageHeading } from "./page-heading.variants";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class" | "title"> {
    /** The page's title, rendered as the page's one level-1 heading. */
    title: string;
    /** Supporting line under the title. Nothing is rendered when omitted. */
    description?: string;
    /** Caller-owned context such as canonical Breadcrumbs. */
    context?: Snippet;
    /** Caller-owned canonical links and controls, kept in document order. */
    actions?: Snippet;
    /**
     * Extra classes, merged over the root slot's own, onto the wrapper around the title and
     * actions.
     */
    class?: string;
  }

  const {
    title,
    description,
    context,
    actions,
    class: className,
    ...rest
  }: Props = $props();

  const slots = $derived(pageHeading());
</script>

<div
  {...(rest as Record<string, unknown>)}
  data-page-heading
  class={slots.root({ class: className })}
>
  <Stack gap="sm" class={slots.identity()}>
    {#if context}<div data-page-heading-context class={slots.context()}>{@render context()}</div>{/if}
    <Heading level={1} role="title" class={slots.title()}>{title}</Heading>
    {#if description}<p class={slots.description()}>{description}</p>{/if}
  </Stack>
  {#if actions}
    <div data-page-heading-actions class={slots.actions()}>{@render actions()}</div>
  {/if}
</div>
