<script lang="ts">
  import { Badge, NodeBadge, Kbd } from '@red-ui/ui-kit'
  import { auth } from './auth.svelte'
  import { goto } from '$app/navigation'

  interface Props {
    cluster?: string
    role?: 'primary' | 'replica' | 'embedded'
    status?: 'connected' | 'connecting' | 'disconnected'
  }
  let {
    cluster = 'localhost:6379',
    role = 'embedded',
    status = 'connected',
  }: Props = $props()

  const tone = $derived(status === 'connected' ? 'ok' : status === 'connecting' ? 'warn' : 'danger')

  function openPalette() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }))
  }
</script>

<header class="topbar">
  <div class="left">
    <div class="brand">red<span class="dot">·</span>ui</div>
    <div class="sep"></div>
    <NodeBadge {role} label={cluster} />
    <Badge tone={tone}>{status}</Badge>
  </div>

  <div class="right">
    <button class="cmdk" onclick={openPalette}>
      <span class="icon">⌕</span>
      <span class="cmdk-label">Search or run</span>
      <span class="cmdk-keys"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
    </button>
    <div class="sep"></div>
    <button class="user" onclick={() => goto('/whoami')} title="View my permissions">
      <span class="user-name">{auth.identity.name}</span>
      <Badge tone="accent">{auth.identity.role}</Badge>
    </button>
  </div>
</header>

<style>
  .topbar {
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    background: color-mix(in srgb, var(--bg-1) 80%, transparent);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--line-1);
    position: relative;
    z-index: 10;
  }
  .left, .right { display: flex; align-items: center; gap: 10px; }
  .brand {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 13px;
    letter-spacing: -0.02em;
    color: var(--fg-0);
  }
  .brand .dot { color: var(--accent); margin: 0 1px; }
  .sep { width: 1px; height: 18px; background: var(--line-2); }

  .cmdk {
    display: inline-flex; align-items: center; gap: 8px;
    height: 28px; padding: 0 8px 0 10px;
    background: var(--bg-2);
    border: 1px solid var(--line-2);
    border-radius: var(--r-md);
    color: var(--fg-2);
    cursor: pointer;
    font-size: 12px;
    transition: border-color 140ms var(--ease-out), color 140ms var(--ease-out);
  }
  .cmdk:hover { border-color: var(--line-3); color: var(--fg-1); }
  .cmdk-keys { display: inline-flex; gap: 2px; margin-left: 4px; }
  .icon { color: var(--fg-3); }

  .user { display: flex; align-items: center; gap: 8px; background: transparent; border: 0; padding: 4px 6px; border-radius: var(--r-md); cursor: pointer; }
  .user:hover { background: var(--bg-2); }
  .user-name { font-size: 12px; color: var(--fg-1); font-family: var(--font-mono); }
</style>
