<script lang="ts">
  import type { QueryResult } from '@red-ui/protocol'
  import { Braces, Gauge, ListFilter, Search, X } from 'lucide-svelte'
  import { compactValue, extractVectors, scalarLabel, vectorMagnitude, type VectorRow } from './vector-render'

  interface Props {
    result: QueryResult
    collection?: string
  }

  let { result, collection }: Props = $props()

  let mode = $state<'metadata' | 'vector' | 'scalar'>('metadata')
  let filter = $state('')
  let selected = $state<VectorRow | null>(null)

  const rows = $derived(extractVectors(result))
  const filtered = $derived.by(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      row.id.toLowerCase().includes(q) ||
      Object.values(row.metadata).some((v) => compactValue(v).toLowerCase().includes(q)),
    )
  })
  const active = $derived(selected ?? filtered[0] ?? null)
  const maxMagnitude = $derived(Math.max(1, ...filtered.map((row) => vectorMagnitude(row.vector))))

  function preview(row: VectorRow): string {
    const entries = Object.entries(row.metadata).slice(0, 3)
    if (entries.length === 0) return ''
    return entries.map(([k, v]) => `${k}=${compactValue(v)}`).join(' · ')
  }

  function barWidth(value: number, vector: number[]): number {
    const max = Math.max(1, ...vector.map((x) => Math.abs(x)))
    return Math.max(2, Math.abs(value) / max * 100)
  }
</script>

<div class="flex h-full flex-col text-fg-1">
  {#if rows.length === 0}
    <div class="flex-1 grid place-items-center text-fg-3 text-[12px] font-mono p-6">
      No vector shape in this result.
    </div>
  {:else}
    <div class="border-b border-line-1 px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono bg-bg-1/40">
      <div class="inline-flex border border-line-2 rounded overflow-hidden">
        <button
          type="button"
          class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors', mode === 'metadata' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
          onclick={() => (mode = 'metadata')}
          aria-pressed={mode === 'metadata'}
        >
          <Braces class="size-3" />
          metadata
        </button>
        <button
          type="button"
          class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors border-l border-line-2', mode === 'vector' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
          onclick={() => (mode = 'vector')}
          aria-pressed={mode === 'vector'}
        >
          <ListFilter class="size-3" />
          vector
        </button>
        <button
          type="button"
          class={['inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors border-l border-line-2', mode === 'scalar' ? 'bg-accent text-white' : 'bg-bg-1 text-fg-2 hover:text-fg-0'].join(' ')}
          onclick={() => (mode = 'scalar')}
          aria-pressed={mode === 'scalar'}
        >
          <Gauge class="size-3" />
          turbovec
        </button>
      </div>

      <div class="inline-flex items-center gap-1.5 border border-line-1 rounded px-2 py-1 bg-bg-0">
        <Search class="size-3 text-fg-3" />
        <input
          type="text"
          bind:value={filter}
          placeholder="id or metadata…"
          class="bg-transparent text-fg-1 outline-none w-[180px] placeholder:text-fg-3"
        />
        {#if filter}
          <button type="button" onclick={() => (filter = '')} class="text-fg-3 hover:text-fg-1 cursor-pointer" aria-label="Clear vector filter">
            <X class="size-3" />
          </button>
        {/if}
      </div>

      <div class="ml-auto text-fg-3">
        {filtered.length.toLocaleString()}{#if filter} of {rows.length.toLocaleString()}{/if} vectors
        {#if collection}· <span class="text-fg-2">{collection}</span>{/if}
      </div>
    </div>

    <div class="flex-1 min-h-0 grid grid-cols-[320px_1fr]">
      <div class="overflow-auto border-r border-line-1 text-[12px] font-mono">
        {#each filtered as row (row.id)}
          <button
            type="button"
            onclick={() => (selected = row)}
            class={[
              'w-full text-left px-3 py-2 border-b border-line-1/60 hover:bg-bg-1/50 cursor-pointer',
              active === row ? 'bg-bg-1 text-fg-0' : 'text-fg-2',
            ].join(' ')}
          >
            <div class="flex items-baseline gap-2">
              <span class="text-accent">{row.id}</span>
              <span class="text-fg-3">{row.dimension}d</span>
              {#if row.scalar !== null}<span class="ml-auto text-fg-1" title={scalarLabel(row)}>{row.scalar.toFixed(4)}</span>{/if}
            </div>
            {#if preview(row)}
              <div class="mt-0.5 truncate text-fg-3">{preview(row)}</div>
            {/if}
          </button>
        {/each}
      </div>

      <div class="overflow-auto p-3 text-[12px] font-mono">
        {#if !active}
          <div class="text-fg-3">No vector selected.</div>
        {:else if mode === 'metadata'}
          <div class="grid grid-cols-[160px_1fr] gap-x-3 gap-y-1.5">
            <div class="text-fg-3">id</div>
            <div class="text-fg-0">{active.id}</div>
            <div class="text-fg-3">dimension</div>
            <div class="text-fg-0">{active.dimension}</div>
            <div class="text-fg-3">magnitude</div>
            <div class="text-fg-0">{active.vector.length > 0 ? vectorMagnitude(active.vector).toFixed(6) : 'n/a'}</div>
            <div class="text-fg-3">coordinates</div>
            <div class="text-fg-0">{active.vector.length > 0 ? 'returned' : 'not returned'}</div>
            {#if active.vectorColumn}
              <div class="text-fg-3">vector column</div>
              <div class="text-fg-0">{active.vectorColumn}</div>
            {/if}
            {#if active.scalarColumn}
              <div class="text-fg-3">turbovec scalar</div>
              <div class="text-fg-0">{active.scalarColumn}</div>
            {/if}
            {#if active.vectorColumn && active.scalarColumn}
              <div class="text-fg-3">materialized from</div>
              <div class="text-fg-1">{active.vectorColumn} → {active.scalarColumn}</div>
            {/if}
            {#each Object.entries(active.metadata) as [k, v]}
              <div class="text-fg-3 truncate">{k}</div>
              <div class="text-fg-1 break-words">{compactValue(v)}</div>
            {/each}
          </div>
        {:else if mode === 'vector'}
          {#if active.vector.length === 0}
            <div class="border border-line-1 bg-bg-1/40 px-3 py-2 text-fg-3">
              This result reports a {active.dimension}d vector, but the coordinate array was not returned by RedDB.
            </div>
          {:else}
            <div class="mb-2 flex items-center justify-between text-fg-3">
              <span>{active.vector.length} dimensions</span>
              <span>|v| {vectorMagnitude(active.vector).toFixed(6)} / max visible {maxMagnitude.toFixed(2)}</span>
            </div>
            <div class="grid gap-1">
              {#each active.vector.slice(0, 256) as value, i}
                <div class="grid grid-cols-[52px_1fr_90px] items-center gap-2">
                  <span class="text-fg-3 text-right">{i}</span>
                  <div class="h-2 bg-bg-2 rounded overflow-hidden">
                    <div class="h-full bg-accent/80" style:width={`${barWidth(value, active.vector)}%`}></div>
                  </div>
                  <span class={value < 0 ? 'text-warn text-right' : 'text-fg-1 text-right'}>{value.toFixed(5)}</span>
                </div>
              {/each}
            </div>
            {#if active.vector.length > 256}
              <div class="mt-2 text-fg-3">Showing first 256 dimensions.</div>
            {/if}
          {/if}
        {:else}
          <table class="w-full border-collapse">
            <thead class="sticky top-0 bg-bg-0">
              <tr class="border-b border-line-1 text-fg-3">
                <th class="px-2 py-1.5 text-left font-normal">id</th>
                <th class="px-2 py-1.5 text-right font-normal">turbovec scalar</th>
                <th class="px-2 py-1.5 text-right font-normal">magnitude</th>
              </tr>
            </thead>
            <tbody>
              {#each filtered as row (row.id)}
                <tr class="border-b border-line-1/60 hover:bg-bg-1/40 cursor-pointer" onclick={() => (selected = row)}>
                  <td class="px-2 py-1 text-accent">{row.id}</td>
                  <td class="px-2 py-1 text-right" title={scalarLabel(row)}>{row.scalar === null ? 'n/a' : row.scalar.toFixed(6)}</td>
                  <td class="px-2 py-1 text-right">{vectorMagnitude(row.vector).toFixed(6)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>
    </div>
  {/if}
</div>
