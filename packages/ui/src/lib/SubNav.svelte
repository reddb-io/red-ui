<script lang="ts">
  import { page } from '$app/state'

  interface Item { href: string; label: string; hint?: string }
  interface Props { items: Item[]; title?: string }
  let { items, title }: Props = $props()
</script>

<nav class="subnav">
  {#if title}<span class="title">{title}</span>{/if}
  {#each items as it}
    <a href={it.href} class:active={page.url.pathname === it.href || page.url.pathname.startsWith(it.href + '/')}>
      {it.label}
      {#if it.hint}<span class="hint">{it.hint}</span>{/if}
    </a>
  {/each}
</nav>

<style>
  .subnav {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 8px 14px;
    background: var(--bg-1);
    border-bottom: 1px solid var(--line-1);
    overflow-x: auto;
  }
  .title {
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fg-3);
    margin-right: 12px;
  }
  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    font-size: 12px;
    color: var(--fg-2);
    text-decoration: none;
    border-radius: var(--r-md);
    white-space: nowrap;
    transition: background 120ms var(--ease-out), color 120ms var(--ease-out);
  }
  a:hover { background: var(--bg-2); color: var(--fg-1); }
  a.active { background: var(--bg-2); color: var(--fg-0); }
  a.active::after {
    content: '';
    position: relative;
    width: 4px; height: 4px;
    border-radius: 9999px;
    background: var(--accent);
    margin-left: 2px;
  }
  .hint { color: var(--fg-3); font-family: var(--font-mono); font-size: 10px; }
</style>
