<script lang="ts">
  import { Card, Badge } from '@red-ui/ui-kit'
  import PageHeader from '$lib/PageHeader.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import { activity } from '$lib/activity.svelte'
  import { connection } from '$lib/connections.svelte'
  import { secureStore } from '$lib/secureStore.svelte'
  import type { AuthPolicy, AuthTenant, AuthUser, Whoami } from '@red-ui/protocol'
  import { Building2, Lock, RefreshCw, ScrollText, Shield, ShieldAlert, Users } from 'lucide-svelte'

  let whoami = $state<Whoami | null>(null)
  let tenants = $state<AuthTenant[]>([])
  let users = $state<AuthUser[]>([])
  let policies = $state<AuthPolicy[]>([])
  let loading = $state(false)
  let whoamiError = $state<string | null>(null)
  let tenantsError = $state<string | null>(null)
  let usersError = $state<string | null>(null)
  let policiesError = $state<string | null>(null)

  const activeUrl = $derived(connection.active.url)
  const connected = $derived(connection.connected)

  function fmtTime(v: number | undefined): string {
    if (!v) return '-'
    const ms = v > 10_000_000_000 ? v : v * 1000
    return new Date(ms).toISOString().replace('T', ' ').slice(0, 19)
  }

  async function refresh() {
    const client = connection.client
    if (!client || secureStore.locked || !connected) {
      whoami = null
      tenants = []
      users = []
      policies = []
      return
    }
    loading = true
    whoamiError = null
    tenantsError = null
    usersError = null
    policiesError = null
    try {
      whoami = await activity.track('security · whoami', () => client.whoami())
    } catch (e) {
      whoamiError = (e as Error).message
      whoami = null
    }
    try {
      users = await activity.track('security · users', () => client.users())
    } catch (e) {
      usersError = (e as Error).message
      users = []
    } finally {
      loading = false
    }
  }

  $effect(() => {
    if (secureStore.locked) return
    void activeUrl
    void connected
    refresh()
  })
</script>

<div class="h-full overflow-auto bg-bg-0 p-6 text-fg-1">
  <PageHeader
    eyebrow="Admin"
    title="Security"
    subtitle="Tenants, users, and policy surfaces are permission-aware. Controls only appear when reddb exposes the grant."
  >
    {#snippet actions()}
      <button
        type="button"
        onclick={refresh}
        disabled={loading || secureStore.locked || !connected}
        class="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-2 bg-bg-2 px-2.5 text-[11px] font-mono text-fg-1 hover:border-line-3 hover:text-fg-0 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RefreshCw class={loading ? 'size-3.5 animate-spin' : 'size-3.5'} />
        refresh
      </button>
    {/snippet}
  </PageHeader>

  {#if secureStore.locked}
    <EmptyState icon={Lock} title="Security locked" message="Enter the master password before red-ui loads auth data." />
  {:else if !connected}
    <EmptyState icon={ShieldAlert} title="No active connection" message="Connect to a reddb instance to inspect security posture." />
  {:else}
    <div class="grid grid-cols-[minmax(280px,0.75fr)_1.25fr] gap-3">
      <div class="grid gap-3 content-start">
        <Card title="session">
          {#if whoamiError}
            <div class="text-[12px] font-mono text-warn break-words">{whoamiError}</div>
          {:else if whoami}
            <div class="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-[12px] font-mono">
              <span class="text-fg-3">authenticated</span>
              <span>{#if whoami.authenticated}<Badge tone="ok">yes</Badge>{:else}<Badge tone="warn">no</Badge>{/if}</span>
              <span class="text-fg-3">username</span>
              <span class="text-fg-0">{whoami.username}</span>
              <span class="text-fg-3">role</span>
              <span class="text-accent">{whoami.role}</span>
              {#if whoami.note}
                <span class="text-fg-3">note</span>
                <span class="text-fg-1">{whoami.note}</span>
              {/if}
            </div>
          {:else}
            <div class="text-[12px] font-mono text-fg-3">Loading session…</div>
          {/if}
        </Card>

        <Card title="tenants">
          {#if tenantsError}
            <div class="mb-2 inline-flex items-center gap-1.5 rounded border border-warn/40 bg-bg-0 px-2 py-1 text-[11px] font-mono text-warn">
              <ShieldAlert class="size-3.5" />
              tenants endpoint denied or unavailable
            </div>
            <pre class="whitespace-pre-wrap break-words text-[12px] font-mono text-fg-3">{tenantsError}</pre>
          {:else if tenants.length === 0}
            <div class="flex items-center gap-2 text-[12px] font-mono text-fg-3">
              <Building2 class="size-4" />
              <span>No tenants returned for this principal.</span>
            </div>
          {:else}
            <div class="grid gap-1 text-[12px] font-mono">
              {#each tenants as tenant, i (`${tenant.id ?? tenant.slug ?? tenant.name ?? i}`)}
                <div class="rounded border border-line-1 bg-bg-0 px-2 py-1.5">
                  <div class="flex items-center gap-2">
                    <span class="text-fg-0">{tenant.name ?? tenant.slug ?? tenant.id ?? 'tenant'}</span>
                    {#if tenant.role}<Badge tone="accent">{tenant.role}</Badge>{/if}
                  </div>
                  <div class="mt-1 text-fg-3">
                    {tenant.id ?? tenant.slug ?? '-'}
                    {#if tenant.grants?.length} · {tenant.grants.join(', ')}{/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </Card>

        <Card title="policies">
          {#if policiesError}
            <div class="mb-2 inline-flex items-center gap-1.5 rounded border border-warn/40 bg-bg-0 px-2 py-1 text-[11px] font-mono text-warn">
              <ShieldAlert class="size-3.5" />
              policies endpoint denied or unavailable
            </div>
            <pre class="whitespace-pre-wrap break-words text-[12px] font-mono text-fg-3">{policiesError}</pre>
          {:else if policies.length === 0}
            <div class="flex items-center gap-2 text-[12px] font-mono text-fg-3">
              <ScrollText class="size-4" />
              <span>No policies returned for this principal.</span>
            </div>
          {:else}
            <div class="grid gap-1 text-[12px] font-mono">
              {#each policies.slice(0, 6) as policy, i (`${policy.id ?? policy.name ?? i}`)}
                <div class="rounded border border-line-1 bg-bg-0 px-2 py-1.5">
                  <div class="flex items-center gap-2">
                    <span class="text-fg-0">{policy.name ?? policy.id ?? 'policy'}</span>
                    {#if policy.effect}<Badge tone={policy.effect === 'deny' ? 'danger' : 'ok'}>{policy.effect}</Badge>{/if}
                  </div>
                  <div class="mt-1 text-fg-3">
                    {policy.action ?? '*'} · {policy.resource ?? '*'}
                    {#if policy.tenant} · tenant {policy.tenant}{/if}
                  </div>
                </div>
              {/each}
              {#if policies.length > 6}
                <div class="text-[11px] text-fg-3">{policies.length - 6} more policies in the table.</div>
              {/if}
            </div>
          {/if}
        </Card>
      </div>

      <div class="grid gap-3 content-start">
        <Card title="users">
          {#if usersError}
            <div class="mb-3 inline-flex items-center gap-1.5 rounded border border-warn/40 bg-bg-0 px-2 py-1 text-[11px] font-mono text-warn">
              <ShieldAlert class="size-3.5" />
              users endpoint denied or unavailable
            </div>
            <pre class="whitespace-pre-wrap break-words text-[12px] font-mono text-fg-3">{usersError}</pre>
          {:else if users.length === 0}
            <div class="flex items-center gap-2 text-[12px] font-mono text-fg-3">
              <Users class="size-4" />
              <span>No users returned for this principal.</span>
            </div>
          {:else}
            <div class="overflow-auto">
              <table class="w-full border-collapse text-[12px] font-mono">
                <thead class="sticky top-0 bg-bg-1">
                  <tr class="border-b border-line-1 text-fg-3">
                    <th class="px-2 py-1.5 text-left font-normal">user</th>
                    <th class="px-2 py-1.5 text-left font-normal">role</th>
                    <th class="px-2 py-1.5 text-left font-normal">mfa</th>
                    <th class="px-2 py-1.5 text-left font-normal">created</th>
                    <th class="px-2 py-1.5 text-left font-normal">last active</th>
                  </tr>
                </thead>
                <tbody>
                  {#each users as user (user.username)}
                    <tr class="border-b border-line-1/60 hover:bg-bg-1/40">
                      <td class="px-2 py-1 text-fg-0">{user.username}</td>
                      <td class="px-2 py-1 text-accent">{user.role ?? '-'}</td>
                      <td class="px-2 py-1">{#if user.mfa}<Badge tone="ok">on</Badge>{:else}<span class="text-fg-3">-</span>{/if}</td>
                      <td class="px-2 py-1 text-fg-2">{fmtTime(user.created_at)}</td>
                      <td class="px-2 py-1 text-fg-2">{fmtTime(user.last_active)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </Card>

        <Card title="policy table">
          {#if policiesError}
            <div class="text-[12px] font-mono text-fg-3">Policy table unavailable for this principal.</div>
          {:else if policies.length === 0}
            <div class="text-[12px] font-mono text-fg-3">No policies to tabulate.</div>
          {:else}
            <div class="overflow-auto">
              <table class="w-full border-collapse text-[12px] font-mono">
                <thead class="sticky top-0 bg-bg-1">
                  <tr class="border-b border-line-1 text-fg-3">
                    <th class="px-2 py-1.5 text-left font-normal">effect</th>
                    <th class="px-2 py-1.5 text-left font-normal">principal</th>
                    <th class="px-2 py-1.5 text-left font-normal">action</th>
                    <th class="px-2 py-1.5 text-left font-normal">resource</th>
                    <th class="px-2 py-1.5 text-left font-normal">tenant</th>
                  </tr>
                </thead>
                <tbody>
                  {#each policies as policy, i (`${policy.id ?? policy.name ?? i}`)}
                    <tr class="border-b border-line-1/60 hover:bg-bg-1/40">
                      <td class="px-2 py-1">{#if policy.effect}<Badge tone={policy.effect === 'deny' ? 'danger' : 'ok'}>{policy.effect}</Badge>{:else}<span class="text-fg-3">-</span>{/if}</td>
                      <td class="px-2 py-1 text-fg-1">{policy.principal ?? '-'}</td>
                      <td class="px-2 py-1 text-accent">{policy.action ?? '*'}</td>
                      <td class="px-2 py-1 text-fg-1">{policy.resource ?? '*'}</td>
                      <td class="px-2 py-1 text-fg-2">{policy.tenant ?? '-'}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </Card>
      </div>
    </div>
  {/if}
</div>
