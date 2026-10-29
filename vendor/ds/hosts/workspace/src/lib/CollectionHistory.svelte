<script lang="ts">
  import Table from "@reddb-io/design-system/data/Table"
  import { Select } from "@reddb-io/design-system/base"
  import { Button as DSButton } from '@reddb-io/design-system/base'
  import { Icon as DSIcon } from '@reddb-io/design-system/base'
  import type { CollectionVcsState, QueryResult, RedClient, VcsCommit, VcsDiff } from './reddb/index'
  import GitCommitHorizontal from '@lucide/svelte/icons/git-commit-horizontal'
  import GitCompareArrows from '@lucide/svelte/icons/git-compare-arrows'
  import LoaderCircle from '@lucide/svelte/icons/loader-circle'
  import RadioTower from '@lucide/svelte/icons/radio-tower'
  import RefreshCw from '@lucide/svelte/icons/refresh-cw'
  import ShieldCheck from '@lucide/svelte/icons/shield-check'
  import DiffRenderer from './renderers/DiffRenderer.svelte'
  import LiveChanges from './LiveChanges.svelte'

  interface Props {
    client?: RedClient
    collection: string
  }

  let { client, collection }: Props = $props()

  let mode = $state<'commits' | 'diff' | 'live'>('commits')
  let vcs = $state<CollectionVcsState | null>(null)
  let commits = $state<VcsCommit[]>([])
  let from = $state('')
  let to = $state('')
  let diff = $state<VcsDiff | null>(null)
  let loading = $state(false)
  let diffLoading = $state(false)
  let error = $state<string | null>(null)
  let loadedKey = ''

  const canDiff = $derived(from.length > 0 && to.length > 0 && from !== to)

  function shortHash(hash: string): string {
    return hash.slice(0, 10)
  }

  function formatTime(ms: number | undefined): string {
    if (!ms) return '-'
    return new Date(ms).toISOString().replace('T', ' ').replace('Z', '')
  }

  function diffResult(d: VcsDiff): QueryResult {
    return {
      ok: true,
      query: `/repo/commits/${d.from}/diff/${d.to}?collection=${collection}`,
      capability: 'diff',
      record_count: d.entries.length,
      result: {
        columns: ['collection', 'entity_id', 'change', 'before', 'after'],
        records: d.entries.map((entry, index) => ({
          values: {
            id: `${entry.collection}:${entry.entity_id}:${index}`,
            collection: entry.collection,
            entity_id: entry.entity_id,
            change: entry.change,
            before: entry.before ?? null,
            after: entry.after ?? null,
          },
        })),
      },
    }
  }

  async function load() {
    if (!client) return
    loading = true
    error = null
    diff = null
    try {
      const [vcsState, log] = await Promise.all([
        client.collectionVcs(collection),
        client.commits({ limit: 40 }),
      ])
      vcs = vcsState
      commits = log
      if (log.length >= 2) {
        to = log[0].hash
        from = log[1].hash
      } else if (log.length === 1) {
        to = log[0].hash
        from = ''
      } else {
        to = ''
        from = ''
      }
    } catch (e) {
      error = (e as Error).message
    } finally {
      loading = false
    }
  }

  async function enableVersioning() {
    if (!client) return
    loading = true
    error = null
    try {
      vcs = await client.setCollectionVcs(collection, true)
      commits = await client.commits({ limit: 40 })
    } catch (e) {
      error = (e as Error).message
    } finally {
      loading = false
    }
  }

  async function runDiff() {
    if (!client || !canDiff) return
    diffLoading = true
    error = null
    try {
      diff = await client.commitDiff(from, to, { collection })
      mode = 'diff'
    } catch (e) {
      error = (e as Error).message
    } finally {
      diffLoading = false
    }
  }

  $effect(() => {
    const key = `${client?.baseUrl ?? 'none'}:${collection}`
    if (key === loadedKey) return
    loadedKey = key
    void load()
  })
</script>

<div class="h-full min-h-0 flex flex-col bg-background">
  <div class="border-b border-muted px-3 py-1.5 flex items-center gap-2 font-mono text-[11px]">
    <div class="inline-flex overflow-hidden rounded border border-control-edge">
      <DSButton variant="ghost" size="sm" aria-pressed={mode === 'commits'}
        type="button"

        onclick={() => (mode = 'commits')}
      >
        <DSIcon icon={GitCommitHorizontal} color="current" class="" />
        commits
      </DSButton>
      <DSButton variant="ghost" size="sm" aria-pressed={mode === 'diff'}
        type="button"

        onclick={() => (mode = 'diff')}
      >
        <DSIcon icon={GitCompareArrows} color="current" class="" />
        diff
      </DSButton>
      <DSButton variant="ghost" size="sm" aria-pressed={mode === 'live'}
        type="button"

        onclick={() => (mode = 'live')}
      >
        <DSIcon icon={RadioTower} color="current" class="" />
        live
      </DSButton>
    </div>

    <span class={vcs?.versioned ? 'text-feedback-success-foreground' : 'text-ink-muted'}>
      {vcs?.versioned ? 'versioned' : 'not versioned'}
    </span>
    <span class="text-ink-muted">{collection}</span>

    <DSButton variant="ghost" size="sm"
      type="button"
      class="ml-auto"
      onclick={() => void load()}
      disabled={loading}
    >
      {#if loading}
        <DSIcon icon={LoaderCircle} color="current" class=" animate-spin" />
      {:else}
        <DSIcon icon={RefreshCw} color="current" class="" />
      {/if}
      refresh
    </DSButton>
  </div>

  {#if error}
    <div class="border-b border-muted px-3 py-1.5 font-mono text-[11px] text-feedback-warning-foreground">{error}</div>
  {/if}

  {#if !client}
    <div class="p-4 font-mono text-[12px] text-ink-muted">No active RedDB connection.</div>
  {:else if loading && !vcs}
    <div class="p-4 font-mono text-[12px] text-ink-muted">Loading version history…</div>
  {:else if vcs && !vcs.versioned}
    <div class="p-4 font-mono text-[12px] text-ink-muted">
      <div class="mb-2 text-foreground">This collection is a normal collection with versioning disabled.</div>
      <DSButton variant="primary" size="sm"
        type="button"

        onclick={() => void enableVersioning()}
      >
        <DSIcon icon={ShieldCheck} color="current" class="" />
        enable versioning
      </DSButton>
    </div>
  {:else if mode === 'live'}
    <div class="flex-1 min-h-0">
      <LiveChanges {collection} />
    </div>
  {:else if mode === 'diff'}
    <div class="border-b border-muted px-3 py-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px]">
      <label class="inline-flex items-center gap-1 text-ink-muted">
        <span>from</span>
        <Select bind:value={from} class="h-7 rounded border border-muted bg-background px-2 text-foreground">
          <option value="">select commit</option>
          {#each commits as commit (commit.hash)}
            <option value={commit.hash}>{shortHash(commit.hash)} · {commit.message}</option>
          {/each}
        </Select>
      </label>
      <label class="inline-flex items-center gap-1 text-ink-muted">
        <span>to</span>
        <Select bind:value={to} class="h-7 rounded border border-muted bg-background px-2 text-foreground">
          <option value="">select commit</option>
          {#each commits as commit (commit.hash)}
            <option value={commit.hash}>{shortHash(commit.hash)} · {commit.message}</option>
          {/each}
        </Select>
      </label>
      <DSButton variant="ghost" size="sm"
        type="button"

        disabled={!canDiff || diffLoading}
        onclick={() => void runDiff()}
      >
        {#if diffLoading}<DSIcon icon={LoaderCircle} color="current" class=" animate-spin" />{:else}<DSIcon icon={GitCompareArrows} color="current" class="" />{/if}
        run diff
      </DSButton>
      {#if diff}
        <span class="ml-auto text-ink-muted">
          +{diff.added} -{diff.removed} ~{diff.modified}
        </span>
      {/if}
    </div>
    <div class="flex-1 min-h-0">
      {#if diff}
        <DiffRenderer result={diffResult(diff)} {collection} />
      {:else}
        <div class="p-4 font-mono text-[12px] text-ink-muted">Choose two commits to compare this collection.</div>
      {/if}
    </div>
  {:else}
    <div class="flex-1 overflow-auto">
      {#if commits.length === 0}
        <div class="p-4 font-mono text-[12px] text-ink-muted">No commits yet.</div>
      {:else}
        <Table caption="Collection commits" captionHidden rowKey="hash" pageSize={80} rows={commits.map(commit => ({hash:commit.hash,short:shortHash(commit.hash),message:commit.message,author:commit.author?.name ?? '-',time:formatTime(commit.timestamp_ms)}))} columns={[{key:'short',header:'commit'},{key:'message',header:'message'},{key:'author',header:'author'},{key:'time',header:'time'}]} />
      {/if}
    </div>
  {/if}
</div>
