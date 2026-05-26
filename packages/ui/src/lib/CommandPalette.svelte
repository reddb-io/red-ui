<script lang="ts">
  import { onMount } from 'svelte'
  import { Kbd } from '@red-ui/ui-kit'
  import { goto as kitGoto } from '$app/navigation'
  import { theme } from './theme.svelte'

  type Group = 'navigate' | 'data' | 'actions' | 'view'

  interface Command {
    id: string
    group: Group
    label: string
    hint?: string
    shortcut?: string
    run: () => void
  }

  let open = $state(false)
  let query = $state('')
  let active = $state(0)
  let inputEl: HTMLInputElement | undefined = $state()

  function fire(name: string) {
    window.dispatchEvent(new CustomEvent(name))
  }

  const commands: Command[] = [
    { id: 'home', group: 'navigate', label: 'Open workspace', hint: '/', run: () => goto('/') },
    { id: 'topology', group: 'navigate', label: 'Open topology', hint: '/cluster', run: () => goto('/cluster') },

    { id: 'new-query', group: 'data', label: 'New query', shortcut: '⌘T', run: () => { fire('red:new-query'); close() } },

    { id: 'open-connect', group: 'actions', label: 'Open Connect dropdown', shortcut: '⌘⇧C', run: () => { fire('red:open-connect'); close() } },
    { id: 'apply-pending', group: 'actions', label: 'Apply pending changes', run: () => { fire('red:apply-pending'); close() } },
    { id: 'discard-pending', group: 'actions', label: 'Discard pending changes', run: () => { fire('red:discard-pending'); close() } },

    { id: 'toggle-theme', group: 'view', label: 'Toggle theme (light / dark)', hint: 'theme', run: () => { theme.toggle(); close() } },
    { id: 'show-shortcuts', group: 'view', label: 'Show keyboard shortcuts', shortcut: '?', run: () => { close(); fire('red:open-shortcuts') } },
  ]

  const filtered = $derived(
    query.trim() === ''
      ? commands
      : commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
  )

  function goto(path: string) {
    kitGoto(path)
    close()
  }

  function close() {
    open = false
    query = ''
    active = 0
  }

  function isTypingTarget(el: EventTarget | null): boolean {
    if (!(el instanceof HTMLElement)) return false
    if (el.isContentEditable) return true
    const tag = el.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  }

  function onKey(e: KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey
    const k = e.key.toLowerCase()

    if (mod && k === 'k') {
      e.preventDefault()
      open = !open
      if (open) setTimeout(() => inputEl?.focus(), 0)
      return
    }

    // Global accelerators wired here so they fire regardless of focus.
    if (mod && e.shiftKey && k === 'c') {
      e.preventDefault()
      fire('red:open-connect')
      return
    }
    if (mod && !e.shiftKey && k === 't' && !isTypingTarget(e.target)) {
      e.preventDefault()
      fire('red:new-query')
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
    const onOpen = () => {
      open = true
      setTimeout(() => inputEl?.focus(), 0)
    }
    window.addEventListener('red:open-palette', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('red:open-palette', onOpen)
    }
  })

  const groupOrder: Group[] = ['navigate', 'data', 'actions', 'view']
  const groupLabel: Record<Group, string> = {
    navigate: 'Navigate',
    data: 'Data',
    actions: 'Actions',
    view: 'View',
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
          {#each items as cmd}
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
    animation: pop 180ms var(--ease-snap);
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
