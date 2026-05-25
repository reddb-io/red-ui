<script lang="ts">
  import { Badge, Button, Card } from '@red-ui/ui-kit'
  import Can from '$lib/Can.svelte'
  import { policies } from '$lib/fixtures'
  import { auth } from '$lib/auth.svelte'
  import PageHeader from '$lib/PageHeader.svelte'

  let selected = $state(policies[0].id)
  const policy = $derived(policies.find((p) => p.id === selected)!)
</script>

<Can action="read" resource="policies">
  {#snippet fallback()}
    <Card title="forbidden">
      <p>Your role <code>{auth.identity.role}</code> doesn't grant <code>read:policies</code>.</p>
    </Card>
  {/snippet}
  <PageHeader
    eyebrow="Admin"
    title="Policies"
    subtitle="{policies.length} rules · evaluated top-down · deny takes precedence over allow"
  >
    {#snippet actions()}
      <Can action="admin" resource="policies">
        <Button variant="primary" size="sm">+ New policy</Button>
      </Can>
    {/snippet}
  </PageHeader>

  <div class="layout">
    <Card>
      <div class="list">
        {#each policies as p}
          <button class="p-row" class:active={p.id === selected} onclick={() => (selected = p.id)}>
            <div class="p-effect">
              {#if p.effect === 'allow'}<Badge tone="ok">allow</Badge>{:else}<Badge tone="danger">deny</Badge>{/if}
            </div>
            <code class="p-name">{p.name}</code>
            <div class="p-meta">
              {p.actions.length} action{p.actions.length > 1 ? 's' : ''} · {p.resources.length} resource{p.resources.length > 1 ? 's' : ''}
            </div>
          </button>
        {/each}
      </div>
    </Card>

    <div class="detail">
      <Card title="policy">
        <div class="p-head">
          <code class="p-id">{policy.id}</code>
          <code class="p-fullname">{policy.name}</code>
          {#if policy.effect === 'allow'}<Badge tone="ok">allow</Badge>{:else}<Badge tone="danger">deny</Badge>{/if}
        </div>

        <div class="section">
          <div class="s-label">principals</div>
          <div class="chips">
            {#each policy.principals as p}
              <code class="chip">{p}</code>
            {/each}
          </div>
        </div>

        <div class="section">
          <div class="s-label">actions</div>
          <div class="chips">
            {#each policy.actions as a}<code class="chip">{a}</code>{/each}
          </div>
        </div>

        <div class="section">
          <div class="s-label">resources</div>
          <div class="chips">
            {#each policy.resources as r}<code class="chip">{r}</code>{/each}
          </div>
        </div>

        <div class="actions">
          <Can action="admin" resource="policies">
            <Button size="sm" variant="primary">Edit</Button>
            <Button size="sm" variant="danger">Delete</Button>
            {#snippet fallback()}<Badge tone="neutral">read-only</Badge>{/snippet}
          </Can>
        </div>
      </Card>

      <Card title="simulate">
        <div class="sim-row">
          <span class="s-label">who</span><code>{auth.identity.name} ({auth.identity.role})</code>
        </div>
        <div class="sim-row">
          <span class="s-label">can</span>
          {#each policy.actions as a}
            {#each policy.resources as r}
              <span class="sim-chip">{a}:{r} → {auth.can(a as any, r as any) ? '✓' : '✗'}</span>
            {/each}
          {/each}
        </div>
      </Card>
    </div>
  </div>
</Can>

<style>
  .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  h1 { font-size: 18px; margin: 0; font-weight: 600; }
  .sub { color: var(--fg-3); font-weight: 400; font-family: var(--font-mono); font-size: 12px; }

  .layout { display: grid; grid-template-columns: 340px 1fr; gap: 12px; align-items: start; }

  .list { display: grid; gap: 2px; }
  .p-row {
    display: grid;
    grid-template-columns: 48px 1fr;
    grid-template-rows: auto auto;
    gap: 4px 10px;
    padding: 8px 10px;
    background: transparent;
    border: 0;
    text-align: left;
    border-radius: var(--r-md);
    cursor: pointer;
  }
  .p-row:hover { background: var(--bg-2); }
  .p-row.active { background: var(--bg-2); box-shadow: inset 2px 0 0 var(--accent); }
  .p-effect { grid-row: 1 / 3; align-self: center; }
  .p-name { font-family: var(--font-mono); font-size: 12px; color: var(--fg-0); }
  .p-meta { color: var(--fg-3); font-family: var(--font-mono); font-size: 10px; }

  .detail { display: grid; gap: 12px; }
  .p-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .p-id { color: var(--fg-3); font-family: var(--font-mono); font-size: 11px; }
  .p-fullname { color: var(--fg-0); font-family: var(--font-mono); font-size: 13px; }

  .section { padding: 10px 0; border-top: 1px solid var(--line-1); }
  .s-label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--fg-3); margin-bottom: 6px; display: block; }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .chip { display: inline-block; padding: 3px 8px; background: var(--bg-2); border: 1px solid var(--line-2); border-radius: var(--r-sm); font-family: var(--font-mono); font-size: 11px; color: var(--fg-0); }

  .actions { display: flex; gap: 6px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line-1); }

  .sim-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 6px 0; font-family: var(--font-mono); font-size: 12px; }
  .sim-row .s-label { margin: 0 8px 0 0; }
  .sim-chip { display: inline-block; padding: 2px 6px; background: var(--bg-2); border-radius: var(--r-sm); font-size: 11px; color: var(--fg-1); }
</style>
