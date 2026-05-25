<script lang="ts">
  import { Badge, Button, Card } from '@red-ui/ui-kit'
  import Can from '$lib/Can.svelte'
  import { kv, type KVEntry } from '$lib/fixtures'
  import { auth, audit } from '$lib/auth.svelte'

  let selectedKey = $state<string>(kv[0].key)
  let revealed = $state<Set<string>>(new Set())
  let filter = $state('')

  const filtered = $derived(
    filter.trim() === '' ? kv : kv.filter((e) => e.key.toLowerCase().includes(filter.toLowerCase())),
  )

  // Build tree from "/"-delimited keys
  type Tree = { [k: string]: Tree | KVEntry }
  const tree = $derived.by<Tree>(() => {
    const out: Tree = {}
    for (const e of filtered) {
      const parts = e.key.split('/')
      let cur = out
      for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in cur) || typeof (cur[parts[i]] as KVEntry).key === 'string') {
          cur[parts[i]] = {} as Tree
        }
        cur = cur[parts[i]] as Tree
      }
      cur[parts[parts.length - 1]] = e
    }
    return out
  })

  const selected = $derived(kv.find((e) => e.key === selectedKey))

  function reveal(entry: KVEntry) {
    if (!auth.can('reveal', 'secret')) return
    revealed = new Set([...revealed, entry.key])
    audit.log('reveal', 'secret', entry.key, 'revealed for 60s')
    setTimeout(() => {
      revealed = new Set([...revealed].filter((k) => k !== entry.key))
    }, 60_000)
  }

  function mask(v: string) {
    return '•'.repeat(Math.min(v.length, 24))
  }

  function ttlText(s?: number) {
    if (!s) return '∞'
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.round(s / 60)}m`
    if (s < 86400) return `${Math.round(s / 3600)}h`
    return `${Math.round(s / 86400)}d`
  }
</script>

<div class="layout">
  <aside class="tree-pane">
    <input class="filter" bind:value={filter} placeholder="Filter keys…" />
    <div class="tree">
      {#snippet renderTree(node: Tree, prefix: string, depth: number)}
        {#each Object.entries(node) as [k, v]}
          {#if 'key' in v && typeof (v as KVEntry).key === 'string'}
            {@const entry = v as KVEntry}
            <button
              class="leaf"
              class:active={entry.key === selectedKey}
              style="padding-left: {depth * 12 + 10}px"
              onclick={() => (selectedKey = entry.key)}
            >
              <span class="leaf-icon">
                {#if entry.type === 'secret'}🔒{:else if entry.type === 'json'}{ }{:else}∙{/if}
              </span>
              <span class="leaf-name">{k}</span>
              <span class="leaf-type">{entry.type}</span>
            </button>
          {:else}
            <div class="folder" style="padding-left: {depth * 12 + 10}px">
              <span class="folder-icon">▸</span>
              <span class="folder-name">{k}</span>
            </div>
            {@render renderTree(v as Tree, `${prefix}${k}/`, depth + 1)}
          {/if}
        {/each}
      {/snippet}
      {@render renderTree(tree, '', 0)}
    </div>
  </aside>

  <section class="detail">
    {#if selected}
      <Card title="key">
        <div class="key-head">
          <code class="full-key">{selected.key}</code>
          <div class="badges">
            <Badge tone="neutral">{selected.type}</Badge>
            {#if selected.encrypted}<Badge tone="accent">encrypted</Badge>{/if}
            <Badge tone="info">TTL {ttlText(selected.ttl)}</Badge>
          </div>
        </div>

        <div class="value-wrap">
          <div class="value-label">value</div>
          {#if selected.type === 'secret'}
            {#if revealed.has(selected.key)}
              <div class="value secret-revealed">
                <code>{selected.value}</code>
                <Badge tone="warn">revealed · audited · auto-hides in 60s</Badge>
              </div>
            {:else}
              <div class="value secret-masked">
                <code>{mask(selected.value)}</code>
                <Can action="reveal" resource="secret">
                  <button class="reveal-btn" onclick={() => reveal(selected)}>
                    <span>👁</span> Reveal
                  </button>
                  {#snippet fallback()}
                    <div class="denied-inline">
                      <Badge tone="danger">cannot reveal</Badge>
                      <span class="why">{auth.whyDenied('reveal', 'secret')}</span>
                    </div>
                  {/snippet}
                </Can>
              </div>
            {/if}
          {:else if selected.type === 'json'}
            <pre class="value json">{JSON.stringify(JSON.parse(selected.value), null, 2)}</pre>
          {:else}
            <pre class="value">{selected.value}</pre>
          {/if}
        </div>

        <div class="meta">
          <span>updated <code>{new Date(selected.updated_at).toLocaleString()}</code></span>
        </div>

        <div class="actions">
          <Can action="write" resource="kv">
            <Button size="sm" variant="primary">Edit value</Button>
          </Can>
          <Can action="delete" resource="kv">
            <Button size="sm" variant="danger">Delete key</Button>
            {#snippet fallback()}<Badge tone="neutral">read-only</Badge>{/snippet}
          </Can>
        </div>
      </Card>

      <Card title="audit · recent">
        {#if audit.entries.length === 0}
          <div class="empty">No audit events yet. Reveal a secret to see it tracked here.</div>
        {:else}
          <div class="audit-list">
            {#each audit.entries.slice(0, 8) as a}
              <div class="audit-row">
                <span class="a-time">{new Date(a.at).toLocaleTimeString()}</span>
                <span class="a-who">{a.who}</span>
                <Badge tone={a.action === 'reveal' ? 'warn' : a.action === 'delete' ? 'danger' : 'info'}>{a.action}</Badge>
                <span class="a-target">{a.target}</span>
              </div>
            {/each}
          </div>
        {/if}
      </Card>
    {/if}
  </section>
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 16px;
    height: 100%;
  }

  .tree-pane {
    background: var(--bg-1);
    border: 1px solid var(--line-1);
    border-radius: var(--r-lg);
    overflow: hidden;
    display: grid;
    grid-template-rows: auto 1fr;
  }
  .filter {
    background: var(--bg-0);
    border: 0;
    border-bottom: 1px solid var(--line-1);
    color: var(--fg-0);
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 10px 12px;
    outline: none;
  }
  .filter::placeholder { color: var(--fg-3); }

  .tree { overflow-y: auto; padding: 6px 4px; }
  .folder, .leaf {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 4px 10px;
    text-align: left;
    background: transparent;
    border: 0;
    font-family: var(--font-mono);
    font-size: 12px;
  }
  .folder { color: var(--fg-2); }
  .folder-icon { color: var(--fg-3); font-size: 10px; }
  .leaf { color: var(--fg-1); cursor: pointer; border-radius: var(--r-sm); }
  .leaf:hover { background: var(--bg-2); }
  .leaf.active { background: var(--bg-2); color: var(--fg-0); box-shadow: inset 2px 0 0 var(--accent); }
  .leaf-icon { width: 14px; text-align: center; font-size: 10px; }
  .leaf-name { flex: 1; }
  .leaf-type { color: var(--fg-3); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }

  .detail { display: grid; gap: 12px; align-content: start; }

  .key-head { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
  .full-key {
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--fg-0);
    word-break: break-all;
  }
  .badges { display: flex; gap: 6px; }

  .value-wrap { margin-top: 8px; }
  .value-label {
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fg-3);
    margin-bottom: 6px;
  }
  .value {
    background: var(--bg-0);
    border: 1px solid var(--line-1);
    border-radius: var(--r-md);
    padding: 12px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--fg-0);
    overflow-x: auto;
    margin: 0;
  }
  .value.json { white-space: pre; }
  .secret-masked, .secret-revealed {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .secret-masked code { letter-spacing: 4px; color: var(--fg-2); }
  .secret-revealed { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
  .secret-revealed code { color: var(--accent); }
  .reveal-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-2);
    border: 1px solid var(--line-2);
    color: var(--fg-1);
    border-radius: var(--r-md);
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
  }
  .reveal-btn:hover { background: var(--accent); color: white; border-color: var(--accent); }
  .denied-inline { display: flex; align-items: center; gap: 8px; }
  .why { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); }

  .meta {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--line-1);
    font-size: 11px;
    color: var(--fg-3);
    font-family: var(--font-mono);
  }
  .meta code { color: var(--fg-1); }

  .actions {
    display: flex;
    gap: 6px;
    margin-top: 12px;
  }

  .audit-list { display: grid; gap: 4px; font-family: var(--font-mono); font-size: 11px; }
  .audit-row {
    display: grid;
    grid-template-columns: 80px 80px auto 1fr;
    gap: 8px;
    align-items: center;
    padding: 4px 8px;
    border-radius: var(--r-sm);
  }
  .audit-row:hover { background: var(--bg-2); }
  .a-time { color: var(--fg-3); }
  .a-who { color: var(--accent); }
  .a-target { color: var(--fg-1); overflow: hidden; text-overflow: ellipsis; }
  .empty { color: var(--fg-3); font-size: 12px; padding: 8px 0; }
</style>
