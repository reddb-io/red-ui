<script lang="ts">
  import SubNav from '$lib/SubNav.svelte'
  let { children } = $props()
  const items = [
    { href: '/admin/users',    label: 'Users' },
    { href: '/admin/policies', label: 'Policies' },
    { href: '/admin/tenants',  label: 'Tenants' },
  ]
</script>

<div class="wrap">
  <SubNav {items} title="Admin" />
  <div class="content">{@render children?.()}</div>
</div>

<style>
  .wrap { display: grid; grid-template-rows: auto 1fr; height: 100%; }
  .content { overflow: auto; padding: 16px 20px; }
</style>
