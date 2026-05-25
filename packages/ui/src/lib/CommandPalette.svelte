<script lang="ts">
  import { onMount } from 'svelte'
  import { Kbd } from '@red-ui/ui-kit'

  interface Command {
    id: string
    group: 'navigate' | 'connect' | 'data' | 'admin' | 'action'
    label: string
    hint?: string
    shortcut?: string
    run: () => void
  }

  let open = $state(false)
  let query = $state('')
  let active = $state(0)
  let inputEl: HTMLInputElement | undefined = $state()

  const commands: Command[] = [
    { id: 'connect', group: 'connect', label: 'Connect to instance…', hint: 'red://…', shortcut: 'C', run: () => goto('/connect') },
    { id: 'topology', group: 'navigate', label: 'Open topology', hint: 'cluster map', shortcut: 'T', run: () => goto('/') },
    { id: 'tables', group: 'data', label: 'Browse tables', shortcut: 'B', run: () => goto('/explore/tables') },
    { id: 'graphs', group: 'data', label: 'Browse graphs', run: () => goto('/explore/graphs') },
    { id: 'kv', group: 'data', label: 'Browse KV (configs & secrets)', run: () => goto('/explore/kv') },
    { id: 'hyper', group: 'data', label: 'Browse hypertables', run: () => goto('/explore/hypertables') },
    { id: 'stats', group: 'data', label: 'Statistics', run: () => goto('/explore/stats') },
    { id: 'users', group: 'admin', label: 'Manage users', run: () => goto('/admin/users') },
    { id: 'policies', group: 'admin', label: 'Manage policies', run: () => goto('/admin/policies') },
    { id: 'tenants', group: 'admin', label: 'Manage tenants', run: () => goto('/admin/tenants') },
    { id: 'whoami', group: 'action', label: 'Show my permissions', hint: 'whoami', run: () => goto('/whoami') },
  ]

  const filtered = $derived(
    query.trim() === ''
      ? commands
      : commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
  )

  function goto(path: string) {
    location.hash = '#' + path
    close()
  }

  function close() {
    open = false
    query = ''
    active = 0
  }

  function onKey(e: KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      open = !open
      if (open) setTimeout(() => inputEl?.focus(), 0)
      return
    }
    if (!open) return
    if (e.key === 'Escape') { close(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, filtered.length - 1) }
    if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0) }
    if (e.key === 'Enter') {
      e.preventDefault()
      filtered[active]?.run()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const groupOrder = ['connect', 'navigate', 'data', 'admin', 'action'] as const
  const groupLabel: Record<string, string> = {
    connect: 'Connect',
    navigate: 'Navigate',
    data: 'Data',
    admin: 'Admin',
    action: 'Actions',
  }
</script>

{#if open}
  <div class="scrim" onclick={close} onkeydown={null} role="presentation"></div>
  <div class="palette" role="dialog" aria-modal="true">
    <div class="input-wrap">
      <span class="search-icon">⌕</span>
      <input
        bind:this={inputEl}
        bind:value={query}
        oninput={() => (active = 0)}
        placeholder="Search or run a command…"
        spellcheck="false"
      />
      <Kbd>esc</Kbd>
    </div>

    <div class="list">
      {#each groupOrder as g}
        {@const items = filtered.filter((c) => c.group === g)}
        {#if items.length}
          <div class="group-label">{groupLabel[g]}</div>
          {#each items as cmd, i}
            {@const idx = filtered.indexOf(cmd)}
            <button
              class="row"
              class:active={idx === active}
              onmouseenter={() => (active = idx)}
              onclick={() => cmd.run()}
            >
              <span class="label">{cmd.label}</span>
              {#if cmd.hint}<span class="hint">{cmd.hint}</span>{/if}
              {#if cmd.shortcut}<Kbd>{cmd.shortcut}</Kbd>{/if}
            </button>
          {/each}
        {/if}
      {/each}
      {#if filtered.length === 0}
        <div class="empty">No commands match "{query}"</div>
      {/if}
    </div>

    <footer>
      <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate</span>
      <span><Kbd>↵</Kbd> run</span>
      <span><Kbd>⌘</Kbd><Kbd>K</Kbd> toggle</span>
    </footer>
  </div>
{/if}

<style>
  .scrim {
    position: fixed; inset: 0; z-index: 100;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    animation: fade 140ms var(--ease-out);
  }
  .palette {
    position: fixed; z-index: 101;
    top: 18%; left: 50%; transform: translateX(-50%);
    width: min(640px, 92vw);
    background: var(--bg-1);
    border: 1px solid var(--line-2);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    animation: pop 180ms var(--ease-spring);
  }
  @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes pop { from { opacity: 0; transform: translate(-50%, -8px) scale(0.98); } to { opacity: 1; transform: translateX(-50%) scale(1); } }

  .input-wrap {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--line-1);
  }
  .search-icon { color: var(--fg-3); font-size: 18px; }
  .input-wrap input {
    flex: 1; background: transparent; border: 0; outline: 0;
    color: var(--fg-0); font-size: 14px;
  }
  .input-wrap input::placeholder { color: var(--fg-3); }

  .list { max-height: 360px; overflow-y: auto; padding: 6px; }
  .group-label {
    padding: 10px 8px 4px;
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fg-3);
  }
  .row {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 8px 10px;
    background: transparent; border: 0; cursor: pointer;
    border-radius: var(--r-md);
    text-align: left;
    color: var(--fg-1);
    font-size: 13px;
  }
  .row.active { background: var(--bg-2); color: var(--fg-0); }
  .label { flex: 1; }
  .hint { color: var(--fg-3); font-family: var(--font-mono); font-size: 11px; }

  .empty { padding: 24px; text-align: center; color: var(--fg-3); font-size: 13px; }

  footer {
    display: flex; gap: 14px; justify-content: flex-end;
    padding: 8px 14px;
    border-top: 1px solid var(--line-1);
    background: var(--bg-0);
    font-size: 11px;
    color: var(--fg-3);
  }
</style>
