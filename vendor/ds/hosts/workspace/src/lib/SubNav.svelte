<script lang="ts">
  import { NavItem } from '@reddb-io/design-system/app'
  import { Badge } from '@reddb-io/design-system/base'
  import { useRouter } from './router.svelte'
  interface Item { href: string; label: string; hint?: string }
  let { items, title }: { items: Item[]; title?: string } = $props()
  const router = useRouter()
</script>

<nav aria-label={title ?? 'Section navigation'} class="flex items-center gap-[var(--reddb-spatial-gap-sm)] overflow-x-auto border-b border-muted bg-background p-[var(--reddb-spatial-inset-sm)]">
  {#if title}<span class="shrink-0 text-sm text-ink-muted">{title}</span>{/if}
  {#each items as item (item.href)}
    <NavItem href={item.href} label={item.label} current={router.path === item.href || router.path.startsWith(item.href + '/')} class="w-auto shrink-0">
      {#snippet trailing()}{#if item.hint}<Badge>{item.hint}</Badge>{/if}{/snippet}
    </NavItem>
  {/each}
</nav>
