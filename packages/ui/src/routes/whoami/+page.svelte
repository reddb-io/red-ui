<script lang="ts">
  import { Badge, Card } from '@red-ui/ui-kit'
  import { auth, type Action, type Resource } from '$lib/auth.svelte'

  const actions: Action[] = ['read', 'write', 'delete', 'reveal', 'admin']
  const resources: Resource[] = ['table', 'graph', 'kv', 'secret', 'hypertable', 'stats', 'users', 'policies', 'tenants']
  const roles: Array<typeof auth.identity.role> = ['reader', 'writer', 'dba', 'owner']
</script>

<div class="grid gap-3.5 p-5 max-w-[1100px] mx-auto">
  <!-- Hero -->
  <div class="grid grid-cols-[auto_1fr_auto] items-center gap-4 p-5 bg-bg-1 border border-line-1 rounded-[10px]">
    <div class="w-16 h-16 rounded-full grid place-items-center font-mono text-[26px] font-semibold text-white bg-gradient-to-br from-accent to-info">
      {auth.identity.name[0].toUpperCase()}
    </div>
    <div>
      <h1 class="m-0 text-[22px] font-semibold tracking-tight">{auth.identity.name}</h1>
      <div class="flex items-center gap-2 mt-1 text-fg-2 text-[13px]">
        <Badge tone="accent">{auth.identity.role}</Badge>
        <span>·</span>
        <code class="font-mono">{auth.identity.tenant}</code>
      </div>
    </div>

    <div class="text-right">
      <span class="block font-mono text-[10px] uppercase tracking-[0.08em] text-fg-3 mb-1.5">Demo: switch role</span>
      <div class="inline-flex bg-bg-2 border border-line-2 rounded-md p-0.5">
        {#each roles as r}
          <button
            onclick={() => auth.switchRole(r)}
            class={[
              'bg-transparent border-0 px-2.5 py-1 font-mono text-[11px] cursor-pointer rounded-sm transition-colors',
              auth.identity.role === r ? 'bg-bg-0 text-accent shadow-[inset_0_0_0_1px_var(--color-accent)]' : 'text-fg-2 hover:text-fg-1'
            ].join(' ')}
          >
            {r}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Permission matrix -->
  <Card title="effective permissions">
    <p class="text-fg-3 text-xs m-0 mb-3">Green = you can do it. Gray = you cannot. Hover for the reason.</p>
    <table class="w-full border-collapse font-mono text-xs">
      <thead>
        <tr>
          <th class="p-2 text-center text-fg-3 text-[10px] uppercase tracking-[0.06em] font-medium border-b border-line-2"></th>
          {#each actions as a}
            <th class="p-2 text-center text-fg-3 text-[10px] uppercase tracking-[0.06em] font-medium border-b border-line-2">{a}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each resources as r}
          <tr>
            <td class="p-2 text-left text-fg-0 font-medium border-b border-line-1">{r}</td>
            {#each actions as a}
              {@const ok = auth.can(a, r)}
              <td
                title={ok ? 'allowed' : auth.whyDenied(a, r) ?? ''}
                class={[
                  'p-2 text-center border-b border-line-1',
                  ok ? 'text-ok font-semibold bg-ok/[0.06]' : 'text-fg-3'
                ].join(' ')}
              >
                {ok ? '✓' : '·'}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </Card>

  <!-- Grants + Denies -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
    <Card title="grants · {auth.identity.grants.length}">
      <div class="grid gap-1 font-mono text-xs">
        {#each auth.identity.grants as g}
          <div class="grid grid-cols-[60px_auto_16px_auto_1fr] items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-bg-2">
            <Badge tone="ok">allow</Badge>
            <code class="text-fg-0">{g.action}</code>
            <span class="text-fg-3 text-center">→</span>
            <code class="text-fg-0">{g.resource}</code>
          </div>
        {/each}
      </div>
    </Card>

    <Card title="denies · {auth.identity.denies.length}">
      {#if auth.identity.denies.length === 0}
        <p class="text-fg-3 text-xs font-mono m-0">No explicit denies. Anything not in grants falls through to default-deny.</p>
      {:else}
        <div class="grid gap-1 font-mono text-xs">
          {#each auth.identity.denies as d}
            <div class="grid grid-cols-[60px_auto_16px_auto] items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-bg-2">
              <Badge tone="danger">deny</Badge>
              <code class="text-fg-0">{d.action}</code>
              <span class="text-fg-3 text-center">→</span>
              <code class="text-fg-0">{d.resource}</code>
              <div class="col-span-full pl-[76px] text-fg-3 text-[10px]">{d.reason}</div>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  </div>
</div>
