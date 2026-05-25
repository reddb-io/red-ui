<script lang="ts">
  import { Badge, Card } from '@red-ui/ui-kit'
  import { auth, type Action, type Resource } from '$lib/auth.svelte'

  const actions: Action[] = ['read', 'write', 'delete', 'reveal', 'admin']
  const resources: Resource[] = ['table', 'graph', 'kv', 'secret', 'hypertable', 'stats', 'users', 'policies', 'tenants']

  const roles: Array<typeof auth.identity.role> = ['reader', 'writer', 'dba', 'owner']
</script>

<div class="layout">
  <div class="hero">
    <div class="avatar">{auth.identity.name[0].toUpperCase()}</div>
    <div class="identity">
      <h1>{auth.identity.name}</h1>
      <div class="meta">
        <Badge tone="accent">{auth.identity.role}</Badge>
        <span>·</span>
        <code>{auth.identity.tenant}</code>
      </div>
    </div>
    <div class="role-switch">
      <span class="rs-label">Demo: switch role</span>
      <div class="rs-buttons">
        {#each roles as r}
          <button class:active={auth.identity.role === r} onclick={() => auth.switchRole(r)}>{r}</button>
        {/each}
      </div>
    </div>
  </div>

  <Card title="effective permissions">
    <p class="hint">Green = you can do it. Gray = you cannot. Hover for the reason.</p>
    <table class="perm">
      <thead>
        <tr>
          <th></th>
          {#each actions as a}<th>{a}</th>{/each}
        </tr>
      </thead>
      <tbody>
        {#each resources as r}
          <tr>
            <td class="res">{r}</td>
            {#each actions as a}
              {@const ok = auth.can(a, r)}
              <td class="cell" class:ok class:no={!ok} title={ok ? 'allowed' : auth.whyDenied(a, r) ?? ''}>
                {ok ? '✓' : '·'}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </Card>

  <div class="row">
    <Card title="grants · {auth.identity.grants.length}">
      <div class="list">
        {#each auth.identity.grants as g}
          <div class="grant">
            <Badge tone="ok">allow</Badge>
            <code>{g.action}</code>
            <span class="arrow">→</span>
            <code>{g.resource}</code>
          </div>
        {/each}
      </div>
    </Card>

    <Card title="denies · {auth.identity.denies.length}">
      {#if auth.identity.denies.length === 0}
        <p class="empty">No explicit denies. Anything not in grants falls through to default-deny.</p>
      {:else}
        <div class="list">
          {#each auth.identity.denies as d}
            <div class="grant deny">
              <Badge tone="danger">deny</Badge>
              <code>{d.action}</code>
              <span class="arrow">→</span>
              <code>{d.resource}</code>
              <div class="reason">{d.reason}</div>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  </div>
</div>

<style>
  .layout { display: grid; gap: 14px; padding: 16px 20px; max-width: 1100px; margin: 0 auto; }

  .hero {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: var(--bg-1);
    border: 1px solid var(--line-1);
    border-radius: var(--r-lg);
  }
  .avatar {
    width: 64px; height: 64px;
    border-radius: 9999px;
    background: linear-gradient(135deg, var(--accent), var(--info));
    color: white;
    display: grid; place-items: center;
    font-family: var(--font-mono); font-size: 26px; font-weight: 600;
  }
  .identity h1 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
  .meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; color: var(--fg-2); font-size: 13px; }
  .meta code { font-family: var(--font-mono); }

  .role-switch { text-align: right; }
  .rs-label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--fg-3); display: block; margin-bottom: 6px; }
  .rs-buttons { display: inline-flex; background: var(--bg-2); border: 1px solid var(--line-2); border-radius: var(--r-md); padding: 2px; }
  .rs-buttons button { background: transparent; border: 0; color: var(--fg-2); padding: 4px 10px; font-family: var(--font-mono); font-size: 11px; cursor: pointer; border-radius: var(--r-sm); }
  .rs-buttons button.active { background: var(--bg-0); color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }

  .hint { color: var(--fg-3); font-size: 12px; margin: 0 0 12px; }

  .perm { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 12px; }
  .perm th { padding: 8px; text-align: center; color: var(--fg-3); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; border-bottom: 1px solid var(--line-2); }
  .perm td { padding: 8px; text-align: center; border-bottom: 1px solid var(--line-1); }
  .res { text-align: left !important; color: var(--fg-0); font-weight: 500; }
  .cell.ok { color: var(--ok); font-weight: 600; background: color-mix(in srgb, var(--ok) 6%, transparent); }
  .cell.no { color: var(--fg-3); }

  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 800px) { .row { grid-template-columns: 1fr; } }

  .list { display: grid; gap: 4px; font-family: var(--font-mono); font-size: 12px; }
  .grant { display: grid; grid-template-columns: 60px auto 16px auto 1fr; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--r-sm); }
  .grant:hover { background: var(--bg-2); }
  .grant.deny { grid-template-columns: 60px auto 16px auto; }
  .grant .reason { grid-column: 1 / -1; color: var(--fg-3); font-size: 10px; padding-left: 76px; }
  .arrow { color: var(--fg-3); text-align: center; }
  code { color: var(--fg-0); }

  .empty { color: var(--fg-3); font-size: 12px; font-family: var(--font-mono); margin: 0; }
</style>
