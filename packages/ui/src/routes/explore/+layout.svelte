<script lang="ts">
  import SubNav from '$lib/SubNav.svelte'
  let { children } = $props()
  const items = [
    { href: '/explore/tables',      label: 'Tables',      hint: 'B' },
    { href: '/explore/graphs',      label: 'Graphs' },
    { href: '/explore/kv',          label: 'KV / Secrets' },
    { href: '/explore/hypertables', label: 'Hypertables' },
    { href: '/explore/stats',       label: 'Stats' },
  ]
</script>

<div class="wrap">
  <SubNav {items} title="Explore" />
  <div class="content">{@render children?.()}</div>
</div>

<style>
  .wrap { display: grid; grid-template-rows: auto 1fr; height: 100%; }
  .content { overflow: auto; padding: 16px 20px; position: relative; }
</style>
