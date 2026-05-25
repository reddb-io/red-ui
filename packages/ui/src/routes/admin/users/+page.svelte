<script lang="ts">
  import { Badge, Button, Card } from '@red-ui/ui-kit'
  import Can from '$lib/Can.svelte'
  import PageHeader from '$lib/PageHeader.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import { auth } from '$lib/auth.svelte'
  import { connection } from '$lib/connections.svelte'
  import type { AuthUser } from '@red-ui/protocol'
  import { Users as UsersIcon, Lock } from 'lucide-svelte'

  let accounts = $state<AuthUser[]>([])
  let loading = $state(false)
  let error = $state<string | null>(null)

  $effect(() => {
    if (!connection.probe.reachable) { accounts = []; return }
    const client = connection.client!
    loading = true
    client.users().then((u) => { accounts = u; loading = false }).catch((e) => { error = e.message; loading = false })
  })

  const roleColor: Record<string, 'accent' | 'info' | 'ok' | 'neutral'> = {
    owner: 'accent', admin: 'accent', dba: 'info', writer: 'ok', reader: 'neutral',
  }

  const canRead = $derived(auth.can('read', 'users'))
</script>

{#if !connection.probe.reachable}
  <PageHeader eyebrow="Admin" title="Users" />
  <EmptyState icon={UsersIcon} title="No connection" message="Connect to a reddb instance to manage users." />
{:else if !canRead}
  <PageHeader eyebrow="Admin" title="Users" />
  <EmptyState
    icon={Lock}
    title="Forbidden"
    message={`Your role ${auth.identity.role} does not grant read:users. Switch role in the topbar (demo) or ask an owner.`}
  />
{:else}
  <PageHeader
    eyebrow="Admin"
    title="Users"
    subtitle={`From ${connection.active.url}/auth/users · ${accounts.length} accounts`}
  >
    {#snippet actions()}
      {#if auth.can('admin', 'users')}
        <Button variant="primary" size="sm">+ Invite user</Button>
      {:else}
        <Badge tone="neutral">read-only</Badge>
      {/if}
    {/snippet}
  </PageHeader>

  {#if error}
    <Card><p class="text-danger text-[12px] font-mono m-0">⚠ {error}</p></Card>
  {:else if loading && accounts.length === 0}
    <Card><p class="text-fg-2 text-[12px] font-mono m-0">Loading users…</p></Card>
  {:else if accounts.length === 0}
    <EmptyState
      icon={UsersIcon}
      title="No users yet"
      message="The reddb instance has no user accounts. Auth may be disabled (anonymous = admin) or no users have been bootstrapped."
      hint="red auth create-user alice --password secret --role admin"
    />
  {:else}
    <Card>
      <table class="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th class="text-left p-2.5 type-label border-b border-line-2">user</th>
            <th class="text-left p-2.5 type-label border-b border-line-2">role</th>
            <th class="text-left p-2.5 type-label border-b border-line-2">MFA</th>
            <th class="text-left p-2.5 type-label border-b border-line-2">last active</th>
            <th class="border-b border-line-2"></th>
          </tr>
        </thead>
        <tbody>
          {#each accounts as u}
            <tr class="hover:bg-bg-2">
              <td class="p-2.5 border-b border-line-1">
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full grid place-items-center font-mono text-[12px] font-semibold text-white bg-gradient-to-br from-accent to-info">
                    {u.username[0]?.toUpperCase() ?? '?'}
                  </div>
                  <code class="font-mono text-fg-0">{u.username}</code>
                </div>
              </td>
              <td class="p-2.5 border-b border-line-1">
                {#if u.role}<Badge tone={roleColor[u.role] ?? 'neutral'}>{u.role}</Badge>{:else}<span class="text-fg-3">—</span>{/if}
              </td>
              <td class="p-2.5 border-b border-line-1">
                {#if u.mfa}<Badge tone="ok">enabled</Badge>{:else}<Badge tone="warn">disabled</Badge>{/if}
              </td>
              <td class="p-2.5 border-b border-line-1 text-fg-2 font-mono text-[11px]">
                {u.last_active ? new Date(u.last_active).toLocaleDateString() : '—'}
              </td>
              <td class="p-2.5 border-b border-line-1">
                <Can action="admin" resource="users">
                  <button class="bg-transparent border border-line-2 text-fg-2 rounded-sm px-2 py-0.5 text-[11px] cursor-pointer hover:bg-bg-2 hover:text-fg-0">Edit</button>
                  {#snippet fallback()}<span class="text-fg-3 text-[11px]">—</span>{/snippet}
                </Can>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </Card>
  {/if}
{/if}
