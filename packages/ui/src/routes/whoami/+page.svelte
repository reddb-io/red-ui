<script lang="ts">
  import { Badge, Card } from '@red-ui/ui-kit'
  import { auth, type Action, type Resource } from '$lib/auth.svelte'
  import { connection } from '$lib/connections.svelte'
  import PageHeader from '$lib/PageHeader.svelte'
  import type { Whoami } from '@red-ui/protocol'

  const actions: Action[] = ['read', 'write', 'delete', 'reveal', 'admin']
  const resources: Resource[] = ['table', 'graph', 'kv', 'secret', 'hypertable', 'stats', 'users', 'policies', 'tenants']
  const roles: Array<typeof auth.identity.role> = ['reader', 'writer', 'dba', 'owner']

  let live = $state<Whoami | null>(null)
  let liveError = $state<string | null>(null)

  $effect(() => {
    if (!connection.probe.reachable) { live = null; return }
    connection.client!.whoami().then((w) => { live = w; liveError = null }).catch((e) => { liveError = e.message })
  })
</script>

<PageHeader
  eyebrow="Identity"
  title="Who am I"
  subtitle="Live identity from {connection.active.label}/auth/whoami, plus the local UI role used to gate destructive actions."
/>

<div class="grid gap-3.5 max-w-[1100px] mx-auto">
  <!-- Live identity from the server -->
  {#if live}
    <Card title="server · /auth/whoami">
      <div class="grid grid-cols-[auto_1fr] items-center gap-4">
        <div class="w-14 h-14 rounded-full grid place-items-center font-mono text-[22px] font-semibold text-white bg-gradient-to-br from-accent to-info">
          {live.username[0]?.toUpperCase() ?? '?'}
        </div>
        <div class="grid gap-1.5">
          <div class="flex items-center gap-2">
            <code class="font-mono text-fg-0 text-[15px]">{live.username}</code>
            <Badge tone="accent">{live.role}</Badge>
            {#if live.authenticated}<Badge tone="ok">authenticated</Badge>{:else}<Badge tone="warn">anonymous</Badge>{/if}
          </div>
          {#if live.note}
            <p class="text-fg-2 text-[12px] m-0">{live.note}</p>
          {/if}
        </div>
      </div>
    </Card>
  {:else if liveError}
    <Card title="server · /auth/whoami">
      <p class="text-danger text-[12px] font-mono m-0">⚠ {liveError}</p>
    </Card>
  {:else if !connection.probe.reachable}
    <Card title="server · /auth/whoami">
      <p class="text-fg-3 text-[12px] font-mono m-0">No server connection. Connect via the topbar switcher to see your live identity.</p>
    </Card>
  {/if}

  <!-- Local UI role (controls Can/permission gates) -->
  <Card title="ui role · gates this client's actions">
    <div class="flex justify-between items-center gap-4 flex-wrap">
      <p class="text-fg-2 text-[12px] m-0 max-w-md">
        This is a UI-side simulated role used to demo permission-aware UX. It does not replace server-side authz — destructive actions
        still require corresponding grants from the server.
      </p>
      <div class="inline-flex bg-bg-2 border border-line-2 rounded-md p-0.5">
        {#each roles as r}
          <button
            onclick={() => auth.switchRole(r)}
            class={[
              'bg-transparent border-0 px-2.5 py-1 font-mono text-[11px] cursor-pointer rounded-sm transition-colors',
              auth.identity.role === r ? 'bg-bg-0 text-accent shadow-[inset_0_0_0_1px_var(--color-accent)]' : 'text-fg-2 hover:text-fg-1'
            ].join(' ')}
          >{r}</button>
        {/each}
      </div>
    </div>
  </Card>

  <!-- Permission matrix from the local UI role -->
  <Card title="effective permissions">
    <p class="text-fg-3 text-xs m-0 mb-3">Green = current UI role allows it. Gray = blocked. Hover for the reason.</p>
    <table class="w-full border-collapse font-mono text-xs">
      <thead>
        <tr>
          <th class="p-2 text-center type-label border-b border-line-2"></th>
          {#each actions as a}<th class="p-2 text-center type-label border-b border-line-2">{a}</th>{/each}
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
</div>
