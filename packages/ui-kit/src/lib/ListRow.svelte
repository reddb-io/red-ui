<script lang="ts">
  import { ListRow } from '@reddb-io/design-system/app'
  import type { Snippet } from 'svelte'

  // Settings-specific slots retained for existing ui-kit consumers.
  interface Props {
    title: string
    description?: string
    hint?: string
    action?: Snippet
    below?: Snippet
    wide?: boolean
    class?: string
  }
  let { title, description, hint, action, below, wide = false, class: klass = '' }: Props = $props()
</script>

<div data-wide={wide ? '' : undefined} class={klass}>
  <ListRow trailing={wide ? undefined : action}>
    <span class="flex items-baseline gap-[var(--reddb-spatial-gap-md)]">
      <span>{title}</span>
      {#if hint}<span class="font-mono text-sm text-ink-muted">{hint}</span>{/if}
    </span>
    {#if description}<span class="text-sm text-ink-muted">{description}</span>{/if}
  </ListRow>
  {#if wide && action}
    <div class="flex flex-col px-[var(--reddb-spatial-inset-md)] pb-[var(--reddb-spatial-inset-md)]">{@render action()}</div>
  {/if}
  {#if below}
    <div class="w-full px-[var(--reddb-spatial-inset-md)] pb-[var(--reddb-spatial-inset-md)]">{@render below()}</div>
  {/if}
</div>
