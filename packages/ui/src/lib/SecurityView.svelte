<script lang="ts">
  import { CodeBlock } from "@reddb-io/design-system/base"
  import Table from "@reddb-io/design-system/data/Table"
  import { Button as DSButton } from '@reddb-io/design-system/base'
  import { Icon as DSIcon } from '@reddb-io/design-system/base'
  import { useWorkspace } from './workspace-context'
  import { Card, Badge } from '@reddb-io/design-system/base'
  import PageHeader from '$lib/PageHeader.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import DisconnectedState from '$lib/DisconnectedState.svelte'
  import { accessLocked } from '@reddb-io/design-system/base/illustrations'

  import type { PermissionDecision } from '$lib/permission-gate'
  import {
    POLICY_READ_CHECK,
    assembleCapabilityMatrix,
    capabilityMatrixChecksFromPolicies,
    type CapabilityMatrixRow,
  } from '$lib/policies'

  import type { AuthPolicy, AuthTenant, AuthUser, Whoami } from '#reddb'
  import Building2 from '@lucide/svelte/icons/building-2'
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2'
  import RefreshCw from '@lucide/svelte/icons/refresh-cw'
  import ScrollText from '@lucide/svelte/icons/scroll-text'
  import ShieldAlert from '@lucide/svelte/icons/shield-alert'
  import Users from '@lucide/svelte/icons/users'
  import XCircle from '@lucide/svelte/icons/x-circle'

  const workspace = useWorkspace()
  const { activity, connection, secureStore } = workspace

  let whoami = $state<Whoami | null>(null)
  let tenants = $state<AuthTenant[]>([])
  let users = $state<AuthUser[]>([])
  let policies = $state<AuthPolicy[]>([])
  let policyReadDecision = $state<PermissionDecision | null>(null)
  let capabilityRows = $state<CapabilityMatrixRow[]>([])
  let loading = $state(false)
  let whoamiError = $state<string | null>(null)
  let tenantsError = $state<string | null>(null)
  let usersError = $state<string | null>(null)
  let policiesError = $state<string | null>(null)
  let capabilityError = $state<string | null>(null)

  const activeUrl = $derived(connection.active.url)
  const connected = $derived(connection.connected)
  const showPolicyPane = $derived(policyReadDecision?.allowed === true)

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
      policyReadDecision = null
      capabilityRows = []
      return
    }
    loading = true
    whoamiError = null
    tenantsError = null
    usersError = null
    policiesError = null
    capabilityError = null
    policyReadDecision = null
    capabilityRows = []
    try {
      whoami = await activity.track('security · whoami', () => client.whoami())
    } catch (e) {
      whoamiError = (e as Error).message
      whoami = null
    }
    try {
      tenants = await activity.track('security · tenants', () => client.tenants())
    } catch (e) {
      tenantsError = (e as Error).message
      tenants = []
    }
    try {
      users = await activity.track('security · users', () => client.users())
    } catch (e) {
      usersError = (e as Error).message
      users = []
    }
    try {
      const [decision] = await activity.track('security · auth.can policy read', () => client.authCan([POLICY_READ_CHECK]))
      policyReadDecision = decision ?? {
        ...POLICY_READ_CHECK,
        allowed: false,
        reason: 'auth.can omitted policy-read decision',
      }
    } catch (e) {
      policyReadDecision = {
        ...POLICY_READ_CHECK,
        allowed: false,
        reason: (e as Error).message || 'auth.can failed',
      }
    }
    if (policyReadDecision.allowed) {
      try {
        policies = await activity.track('security · policies', () => client.policies())
      } catch (e) {
        policiesError = (e as Error).message
        policies = []
      }
      try {
        const checks = capabilityMatrixChecksFromPolicies(policies)
        const decisions = await activity.track('security · auth.can capability matrix', () => client.authCan(checks))
        capabilityRows = assembleCapabilityMatrix(policies, decisions)
      } catch (e) {
        capabilityError = (e as Error).message
        capabilityRows = []
      }
    } else {
      policies = []
      capabilityRows = []
    }
    loading = false
  }

  $effect(() => {
    if (secureStore.locked) return
    void activeUrl
    void connected
    refresh()
  })
</script>

<div class="h-full overflow-auto bg-background p-6 text-foreground">
  <PageHeader
    eyebrow="Admin"
    title="Security"
    subtitle="Tenants, users, and policy surfaces are permission-aware. Controls only appear when reddb exposes the grant."
  >
    {#snippet actions()}
      <DSButton variant="secondary" size="sm"
        type="button"
        onclick={refresh}
        disabled={loading || secureStore.locked || !connected}

      >
        <DSIcon icon={RefreshCw} color="current" class={loading ? ' animate-spin' : ''} />
        refresh
      </DSButton>
    {/snippet}
  </PageHeader>

  {#if secureStore.locked}
    <EmptyState illustration={accessLocked} title="Security locked" message="Enter the master password before red-ui loads auth data." />
  {:else if !connected}
    <DisconnectedState message="Connect to a reddb instance to inspect its users, policies and security posture." />
  {:else}
    <div class="grid grid-cols-[minmax(280px,0.75fr)_1.25fr] gap-3">
      <div class="grid gap-3 content-start">
        <Card title="session">
          {#if whoamiError}
            <div class="text-[12px] font-mono text-feedback-warning-foreground break-words">{whoamiError}</div>
          {:else if whoami}
            <div class="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-[12px] font-mono">
              <span class="text-ink-muted">authenticated</span>
              <span>{#if whoami.authenticated}<Badge tone="success">yes</Badge>{:else}<Badge tone="warning">no</Badge>{/if}</span>
              <span class="text-ink-muted">username</span>
              <span class="text-foreground">{whoami.username}</span>
              <span class="text-ink-muted">role</span>
              <span class="text-primary-text">{whoami.role}</span>
              {#if whoami.note}
                <span class="text-ink-muted">note</span>
                <span class="text-foreground">{whoami.note}</span>
              {/if}
            </div>
          {:else}
            <div class="text-[12px] font-mono text-ink-muted">Loading session…</div>
          {/if}
        </Card>

        <Card title="tenants">
          {#if tenantsError}
            <div class="mb-2 inline-flex items-center gap-1.5 rounded border border-feedback-warning-border/40 bg-background px-2 py-1 text-[11px] font-mono text-feedback-warning-foreground">
              <DSIcon icon={ShieldAlert} color="current" class="" />
              tenants endpoint denied or unavailable
            </div>
            <CodeBlock code={tenantsError} />
          {:else if tenants.length === 0}
            <div class="flex items-center gap-2 text-[12px] font-mono text-ink-muted">
              <DSIcon icon={Building2} color="current" class="" />
              <span>No tenants returned for this principal.</span>
            </div>
          {:else}
            <div class="grid gap-1 text-[12px] font-mono">
              {#each tenants as tenant, i (`${tenant.id ?? tenant.slug ?? tenant.name ?? i}`)}
                <div class="rounded border border-muted bg-background px-2 py-1.5">
                  <div class="flex items-center gap-2">
                    <span class="text-foreground">{tenant.name ?? tenant.slug ?? tenant.id ?? 'tenant'}</span>
                    {#if tenant.role}<Badge tone="neutral">{tenant.role}</Badge>{/if}
                  </div>
                  <div class="mt-1 text-ink-muted">
                    {tenant.id ?? tenant.slug ?? '-'}
                    {#if tenant.grants?.length} · {tenant.grants.join(', ')}{/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </Card>

        {#if showPolicyPane}
          <Card title="policies">
            {#if policiesError}
              <div class="mb-2 inline-flex items-center gap-1.5 rounded border border-feedback-warning-border/40 bg-background px-2 py-1 text-[11px] font-mono text-feedback-warning-foreground">
                <DSIcon icon={ShieldAlert} color="current" class="" />
                policies endpoint denied or unavailable
              </div>
              <CodeBlock code={policiesError} />
            {:else if policies.length === 0}
              <div class="flex items-center gap-2 text-[12px] font-mono text-ink-muted">
                <DSIcon icon={ScrollText} color="current" class="" />
                <span>No policies returned for this principal.</span>
              </div>
            {:else}
              <div class="grid gap-1 text-[12px] font-mono">
                {#each policies.slice(0, 6) as policy, i (`${policy.id ?? policy.name ?? i}`)}
                  <div class="rounded border border-muted bg-background px-2 py-1.5">
                    <div class="flex items-center gap-2">
                      <span class="text-foreground">{policy.name ?? policy.id ?? 'policy'}</span>
                      {#if policy.effect}<Badge tone={policy.effect === 'deny' ? 'danger' : 'success'}>{policy.effect}</Badge>{/if}
                    </div>
                    <div class="mt-1 text-ink-muted">
                      {policy.action ?? '*'} · {policy.resource ?? '*'}
                      {#if policy.tenant} · tenant {policy.tenant}{/if}
                    </div>
                  </div>
                {/each}
                {#if policies.length > 6}
                  <div class="text-[11px] text-ink-muted">{policies.length - 6} more policies in the table.</div>
                {/if}
              </div>
            {/if}
          </Card>
        {/if}
      </div>

      <div class="grid gap-3 content-start">
        <Card title="users">
          {#if usersError}
            <div class="mb-3 inline-flex items-center gap-1.5 rounded border border-feedback-warning-border/40 bg-background px-2 py-1 text-[11px] font-mono text-feedback-warning-foreground">
              <DSIcon icon={ShieldAlert} color="current" class="" />
              users endpoint denied or unavailable
            </div>
            <CodeBlock code={usersError} />
          {:else if users.length === 0}
            <div class="flex items-center gap-2 text-[12px] font-mono text-ink-muted">
              <DSIcon icon={Users} color="current" class="" />
              <span>No users returned for this principal.</span>
            </div>
          {:else}
            <div class="overflow-auto">
              <Table caption="Users" captionHidden rowKey="username" pageSize={80} rows={users.map(user => ({...user, role: user.role ?? '-', created: fmtTime(user.created_at), active: fmtTime(user.last_active)}))} columns={[{key:'username',header:'user'},{key:'role',header:'role'},{key:'mfa',header:'mfa'},{key:'created',header:'created'},{key:'active',header:'last active'}]}>
{#snippet cell({column,value,text})}{#if column.key === 'mfa'}<Badge tone={value ? 'success' : 'neutral'}>{value ? 'on' : '-'}</Badge>{:else}{text}{/if}{/snippet}
</Table>
            </div>
          {/if}
        </Card>

        {#if showPolicyPane}
          <Card title="policy table">
            {#if policiesError}
              <div class="text-[12px] font-mono text-ink-muted">Policy table unavailable for this principal.</div>
            {:else if policies.length === 0}
              <div class="text-[12px] font-mono text-ink-muted">No policies to tabulate.</div>
            {:else}
              <div class="overflow-auto">
                <Table caption="Policies" captionHidden rowKey="key" pageSize={80} rows={policies.map((policy,index) => ({key:`${index}:${policy.id ?? policy.name ?? ''}`, effect:policy.effect ?? '-', principal:policy.principal ?? '-', action:policy.action ?? '*', resource:policy.resource ?? '*', tenant:policy.tenant ?? '-'}))} columns={[{key:'effect',header:'effect'},{key:'principal',header:'principal'},{key:'action',header:'action'},{key:'resource',header:'resource'},{key:'tenant',header:'tenant'}]}>
{#snippet cell({column,value,text})}{#if column.key === 'effect' && value !== '-'}<Badge tone={value === 'deny' ? 'danger' : 'success'}>{text}</Badge>{:else}{text}{/if}{/snippet}
</Table>
              </div>
            {/if}
          </Card>

          <Card title="my capabilities">
            {#if capabilityError}
              <div class="mb-2 inline-flex items-center gap-1.5 rounded border border-feedback-warning-border/40 bg-background px-2 py-1 text-[11px] font-mono text-feedback-warning-foreground">
                <DSIcon icon={ShieldAlert} color="current" class="" />
                capability matrix unavailable
              </div>
              <CodeBlock code={capabilityError} />
            {:else if capabilityRows.length === 0}
              <div class="text-[12px] font-mono text-ink-muted">No capability checks returned.</div>
            {:else}
              <div class="overflow-auto">
                <Table caption="My capabilities" captionHidden rowKey="id" pageSize={80} rows={capabilityRows.map(row => ({...row,reason:row.reason ?? '-'}))} columns={[{key:'allowed',header:'can'},{key:'action',header:'action'},{key:'resourceLabel',header:'resource'},{key:'effects',header:'policy effect'},{key:'reason',header:'reason'}]}>
{#snippet cell({column,value,text})}{#if column.key === 'allowed'}<Badge tone={value ? 'success' : 'danger'}>{value ? 'yes' : 'no'}</Badge>{:else if column.key === 'effects'}{#each (Array.isArray(value) ? value : []) as effect}<Badge tone={effect === 'deny' ? 'danger' : 'success'}>{effect}</Badge>{:else}-{/each}{:else}{text}{/if}{/snippet}
</Table>
              </div>
            {/if}
          </Card>
        {/if}
      </div>
    </div>
  {/if}
</div>
