<script lang="ts">
  import { Badge, Button, Card } from '@red-ui/ui-kit'
  import Can from '$lib/Can.svelte'
  import { users } from '$lib/fixtures'
  import { auth } from '$lib/auth.svelte'

  const roleColor: Record<string, 'accent' | 'info' | 'ok' | 'neutral'> = {
    owner: 'accent', dba: 'info', writer: 'ok', reader: 'neutral',
  }
</script>

<Can action="read" resource="users">
  {#snippet fallback()}
    <div class="forbidden">
      <Card title="forbidden">
        <h2>You can't see users.</h2>
        <p>Your role <code>{auth.identity.role}</code> doesn't grant <code>read:users</code>.</p>
        <p class="muted">Switch role in the topbar (demo) or ask an owner to extend your policy.</p>
      </Card>
    </div>
  {/snippet}
  <div class="head">
    <h1>Users <span class="sub">· {users.length} total</span></h1>
    <Can action="admin" resource="users">
      <Button variant="primary" size="sm">+ Invite user</Button>
      {#snippet fallback()}
        <Badge tone="neutral">read-only · ask owner to invite</Badge>
      {/snippet}
    </Can>
  </div>

  <Card>
    <table>
      <thead>
        <tr>
          <th>user</th><th>role</th><th>tenant</th><th>MFA</th><th>last active</th><th></th>
        </tr>
      </thead>
      <tbody>
        {#each users as u}
          <tr>
            <td>
              <div class="user-cell">
                <div class="avatar">{u.email[0].toUpperCase()}</div>
                <div>
                  <div class="email">{u.email}</div>
                  <code class="uid">{u.id.slice(0, 8)}</code>
                </div>
              </div>
            </td>
            <td><Badge tone={roleColor[u.role]}>{u.role}</Badge></td>
            <td><code>{u.tenant}</code></td>
            <td>{#if u.mfa}<Badge tone="ok">enabled</Badge>{:else}<Badge tone="warn">disabled</Badge>{/if}</td>
            <td><span class="muted">{new Date(u.last_active).toLocaleDateString()}</span></td>
            <td class="actions">
              <Can action="admin" resource="users">
                <button class="row-btn">Edit</button>
                <button class="row-btn danger">Revoke</button>
                {#snippet fallback()}<span class="muted">—</span>{/snippet}
              </Can>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </Card>
</Can>

<style>
  .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  h1 { font-size: 18px; margin: 0; font-weight: 600; }
  .sub { color: var(--fg-3); font-weight: 400; font-family: var(--font-mono); font-size: 12px; }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 10px 12px; font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--fg-3); border-bottom: 1px solid var(--line-2); }
  td { padding: 10px 12px; border-bottom: 1px solid var(--line-1); color: var(--fg-1); }
  tr:hover td { background: var(--bg-2); }
  tr:last-child td { border-bottom: 0; }

  .user-cell { display: flex; align-items: center; gap: 10px; }
  .avatar {
    width: 28px; height: 28px;
    border-radius: 9999px;
    background: linear-gradient(135deg, var(--accent), var(--info));
    color: white;
    display: grid; place-items: center;
    font-family: var(--font-mono); font-size: 12px; font-weight: 600;
  }
  .email { color: var(--fg-0); font-size: 13px; }
  .uid { color: var(--fg-3); font-family: var(--font-mono); font-size: 10px; }
  .muted { color: var(--fg-3); font-family: var(--font-mono); font-size: 11px; }
  code { font-family: var(--font-mono); font-size: 12px; color: var(--fg-1); }

  .actions { display: flex; gap: 4px; }
  .row-btn { background: transparent; border: 1px solid var(--line-2); color: var(--fg-2); border-radius: var(--r-sm); padding: 2px 8px; font-size: 11px; cursor: pointer; }
  .row-btn:hover { background: var(--bg-2); color: var(--fg-0); }
  .row-btn.danger:hover { background: var(--danger); color: white; border-color: var(--danger); }

  .forbidden { display: grid; place-items: center; padding-top: 60px; }
  .forbidden h2 { font-size: 16px; margin: 0 0 8px; }
  .forbidden p { color: var(--fg-2); margin: 4px 0; font-size: 13px; }
</style>
