<script lang="ts">
  // The "live or empty — never fake" fallback: a centered icon + title +
  // optional description, with an optional `action` slot (a fix command, a
  // primary button). Used when a list has no rows or a surface is unreachable.
  import type { Snippet } from 'svelte'

  interface Props {
    title: string
    description?: string
    /** Leading icon, rendered muted above the title. */
    icon?: Snippet
    /** Optional call to action beneath the copy. */
    action?: Snippet
    class?: string
  }
  let { title, description, icon, action, class: klass = '' }: Props = $props()
</script>

<div class="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center {klass}">
  {#if icon}
    <span class="flex size-8 items-center justify-center text-fg-3">{@render icon()}</span>
  {/if}
  <p class="text-[13px] text-fg-1">{title}</p>
  {#if description}
    <p class="max-w-prose text-[12px] leading-relaxed text-fg-2">{description}</p>
  {/if}
  {#if action}
    <div class="mt-2">{@render action()}</div>
  {/if}
</div>
