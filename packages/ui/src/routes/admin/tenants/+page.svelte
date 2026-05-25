<script lang="ts">
  import { Badge, Card, Button } from '@red-ui/ui-kit'
  import Can from '$lib/Can.svelte'
  import { tenants } from '$lib/fixtures'
  import { auth } from '$lib/auth.svelte'

  const planTone: Record<string, 'accent' | 'info' | 'ok' | 'neutral'> = {
    internal: 'neutral', free: 'neutral', pro: 'info', enterprise: 'accent',
  }

  const totalMrr = tenants.reduce((sum, t) => sum + t.mrr, 0)
  const totalUsers = tenants.reduce((sum, t) => sum + t.users, 0)
</script>

<Can action="read" resource="tenants">
  {#snippet fallback()}
    <Card title="forbidden">
      <p>Your role <code>{auth.identity.role}</code> doesn't grant <code>read:tenants</code>.</p>
    </Card>
  {/snippet}
  <div class="head">
    <h1>Tenants <span class="sub">· {tenants.length} active · {totalUsers} users · ${(totalMrr / 100).toLocaleString()} MRR</span></h1>
    <Can action="admin" resource="tenants">
      <Button variant="primary" size="sm">+ New tenant</Button>
    </Can>
  </div>

  <div class="grid">
    {#each tenants as t}
      <Card>
        <div class="t-card">
          <div class="t-top">
            <code class="t-slug">{t.slug}</code>
            <Badge tone={planTone[t.plan]}>{t.plan}</Badge>
          </div>
          <div class="t-stats">
            <div class="stat">
              <div class="s-label">MRR</div>
              <div class="s-value">${(t.mrr / 100).toLocaleString()}</div>
            </div>
            <div class="stat">
              <div class="s-label">users</div>
              <div class="s-value">{t.users}</div>
            </div>
            <div class="stat">
              <div class="s-label">since</div>
              <div class="s-value small">{new Date(t.created).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</div>
            </div>
          </div>
          <div class="t-foot">
            <code class="t-id">{t.id.slice(0, 8)}…</code>
            <Can action="admin" resource="tenants">
              <button class="row-btn">Manage</button>
              {#snippet fallback()}<span class="muted">view-only</span>{/snippet}
            </Can>
          </div>
        </div>
      </Card>
    {/each}
  </div>
</Can>

<style>
  .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  h1 { font-size: 18px; margin: 0; font-weight: 600; }
  .sub { color: var(--fg-3); font-weight: 400; font-family: var(--font-mono); font-size: 12px; }

  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }

  .t-card { display: grid; gap: 12px; }
  .t-top { display: flex; justify-content: space-between; align-items: center; }
  .t-slug { font-family: var(--font-mono); font-size: 14px; color: var(--fg-0); }

  .t-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 8px 0; border-top: 1px solid var(--line-1); border-bottom: 1px solid var(--line-1); }
  .stat { text-align: center; }
  .s-label { font-family: var(--font-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--fg-3); }
  .s-value { font-family: var(--font-mono); font-size: 15px; font-weight: 600; color: var(--fg-0); margin-top: 2px; }
  .s-value.small { font-size: 11px; font-weight: 500; color: var(--fg-1); }

  .t-foot { display: flex; justify-content: space-between; align-items: center; }
  .t-id { color: var(--fg-3); font-family: var(--font-mono); font-size: 10px; }
  .row-btn { background: var(--bg-2); border: 1px solid var(--line-2); color: var(--fg-1); border-radius: var(--r-sm); padding: 3px 10px; font-size: 11px; cursor: pointer; }
  .row-btn:hover { background: var(--bg-3); color: var(--fg-0); }
  .muted { color: var(--fg-3); font-family: var(--font-mono); font-size: 11px; }
</style>
