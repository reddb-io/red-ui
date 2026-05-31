<script lang="ts">
  import type { CollectionVcsState, QueryResult, RedClient, VcsCommit, VcsDiff } from '#reddb'
  import { GitCommitHorizontal, GitCompareArrows, LoaderCircle, RadioTower, RefreshCw, ShieldCheck } from 'lucide-svelte'
  import DiffRenderer from '$lib/renderers/DiffRenderer.svelte'
  import LiveChanges from '$lib/LiveChanges.svelte'

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

<div class="h-full min-h-0 flex flex-col bg-bg-0">
  <div class="border-b border-line-1 px-3 py-1.5 flex items-center gap-2 font-mono text-[11px]">
    <div class="inline-flex overflow-hidden rounded border border-line-2">
      <button
        type="button"
        class={['inline-flex h-7 items-center gap-1 px-2', mode === 'commits' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
        onclick={() => (mode = 'commits')}
      >
        <GitCommitHorizontal class="size-3" />
        commits
      </button>
      <button
        type="button"
        class={['inline-flex h-7 items-center gap-1 border-l border-line-2 px-2', mode === 'diff' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
        onclick={() => (mode = 'diff')}
      >
        <GitCompareArrows class="size-3" />
        diff
      </button>
      <button
        type="button"
        class={['inline-flex h-7 items-center gap-1 border-l border-line-2 px-2', mode === 'live' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
        onclick={() => (mode = 'live')}
      >
        <RadioTower class="size-3" />
        live
      </button>
    </div>

    <span class={vcs?.versioned ? 'text-ok' : 'text-fg-3'}>
      {vcs?.versioned ? 'versioned' : 'not versioned'}
    </span>
    <span class="text-fg-3">{collection}</span>

    <button
      type="button"
      class="ml-auto inline-flex h-7 items-center gap-1 rounded border border-line-1 px-2 text-fg-3 hover:bg-bg-2 hover:text-fg-1"
      onclick={() => void load()}
      disabled={loading}
    >
      {#if loading}
        <LoaderCircle class="size-3 animate-spin" />
      {:else}
        <RefreshCw class="size-3" />
      {/if}
      refresh
    </button>
  </div>

  {#if error}
    <div class="border-b border-line-1 px-3 py-1.5 font-mono text-[11px] text-warn">{error}</div>
  {/if}

  {#if !client}
    <div class="p-4 font-mono text-[12px] text-fg-3">No active RedDB connection.</div>
  {:else if loading && !vcs}
    <div class="p-4 font-mono text-[12px] text-fg-3">Loading version history…</div>
  {:else if vcs && !vcs.versioned}
    <div class="p-4 font-mono text-[12px] text-fg-3">
      <div class="mb-2 text-fg-1">This collection is a normal collection with versioning disabled.</div>
      <button
        type="button"
        class="inline-flex h-7 items-center gap-1 rounded border border-accent/40 bg-accent px-2 text-white hover:bg-accent/90"
        onclick={() => void enableVersioning()}
      >
        <ShieldCheck class="size-3" />
        enable versioning
      </button>
    </div>
  {:else if mode === 'live'}
    <div class="flex-1 min-h-0">
      <LiveChanges {collection} />
    </div>
  {:else if mode === 'diff'}
    <div class="border-b border-line-1 px-3 py-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px]">
      <label class="inline-flex items-center gap-1 text-fg-3">
        <span>from</span>
        <select bind:value={from} class="h-7 rounded border border-line-1 bg-bg-0 px-2 text-fg-1">
          <option value="">select commit</option>
          {#each commits as commit (commit.hash)}
            <option value={commit.hash}>{shortHash(commit.hash)} · {commit.message}</option>
          {/each}
        </select>
      </label>
      <label class="inline-flex items-center gap-1 text-fg-3">
        <span>to</span>
        <select bind:value={to} class="h-7 rounded border border-line-1 bg-bg-0 px-2 text-fg-1">
          <option value="">select commit</option>
          {#each commits as commit (commit.hash)}
            <option value={commit.hash}>{shortHash(commit.hash)} · {commit.message}</option>
          {/each}
        </select>
      </label>
      <button
        type="button"
        class="inline-flex h-7 items-center gap-1 rounded border border-line-1 px-2 text-fg-2 hover:bg-bg-2 disabled:text-fg-3"
        disabled={!canDiff || diffLoading}
        onclick={() => void runDiff()}
      >
        {#if diffLoading}<LoaderCircle class="size-3 animate-spin" />{:else}<GitCompareArrows class="size-3" />{/if}
        run diff
      </button>
      {#if diff}
        <span class="ml-auto text-fg-3">
          +{diff.added} -{diff.removed} ~{diff.modified}
        </span>
      {/if}
    </div>
    <div class="flex-1 min-h-0">
      {#if diff}
        <DiffRenderer result={diffResult(diff)} {collection} />
      {:else}
        <div class="p-4 font-mono text-[12px] text-fg-3">Choose two commits to compare this collection.</div>
      {/if}
    </div>
  {:else}
    <div class="flex-1 overflow-auto">
      {#if commits.length === 0}
        <div class="p-4 font-mono text-[12px] text-fg-3">No commits yet.</div>
      {:else}
        <table class="w-full border-collapse font-mono text-[12px]">
          <thead class="sticky top-0 bg-bg-0 text-fg-3">
            <tr class="border-b border-line-1">
              <th class="px-3 py-1.5 text-left font-normal">commit</th>
              <th class="px-3 py-1.5 text-left font-normal">message</th>
              <th class="px-3 py-1.5 text-left font-normal">author</th>
              <th class="px-3 py-1.5 text-left font-normal">time</th>
            </tr>
          </thead>
          <tbody>
            {#each commits as commit (commit.hash)}
              <tr class="border-b border-line-1/60 hover:bg-bg-1/50">
                <td class="px-3 py-1.5 text-accent">{shortHash(commit.hash)}</td>
                <td class="px-3 py-1.5 text-fg-1">{commit.message}</td>
                <td class="px-3 py-1.5 text-fg-3">{commit.author?.name ?? '-'}</td>
                <td class="px-3 py-1.5 text-fg-3">{formatTime(commit.timestamp_ms)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}
</div>
