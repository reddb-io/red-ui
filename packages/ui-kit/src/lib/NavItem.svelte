<script lang="ts">
  // A navigation entry for the SplitView nav pane: leading icon + label, an
  // active state (accent-marked, `aria-current="page"`), and an optional
  // trailing slot (a count Pill, a chevron). Renders as an `<a>` when `href` is
  // given, otherwise a `<button>` — so it works for both routing and local
  // section state.
  import type { Snippet } from 'svelte'

  interface Props {
    label: string
    icon?: Snippet
    trailing?: Snippet
    active?: boolean
    href?: string
    onclick?: (e: MouseEvent) => void
    class?: string
  }
  let {
    label,
    icon,
    trailing,
    active = false,
    href,
    onclick,
    class: klass = '',
  }: Props = $props()

  const cls = $derived(
    [
      'inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors',
      active ? 'bg-bg-2 text-fg-0' : 'text-fg-2 hover:bg-bg-2 hover:text-fg-0',
      klass,
    ].join(' '),
  )
</script>

{#if href}
  <a {href} {onclick} aria-current={active ? 'page' : undefined} class={cls}>
    {#if icon}
      <span class="flex size-3.5 shrink-0 items-center justify-center">{@render icon()}</span>
    {/if}
    <span class="flex-1 truncate">{label}</span>
    {#if trailing}<span class="shrink-0">{@render trailing()}</span>{/if}
  </a>
{:else}
  <button type="button" {onclick} aria-current={active ? 'page' : undefined} class={cls}>
    {#if icon}
      <span class="flex size-3.5 shrink-0 items-center justify-center">{@render icon()}</span>
    {/if}
    <span class="flex-1 truncate">{label}</span>
    {#if trailing}<span class="shrink-0">{@render trailing()}</span>{/if}
  </button>
{/if}
