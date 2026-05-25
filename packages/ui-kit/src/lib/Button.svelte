<script lang="ts">
  interface Props {
    variant?: 'primary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
    disabled?: boolean
    onclick?: (e: MouseEvent) => void
    children?: import('svelte').Snippet
  }
  let { variant = 'ghost', size = 'md', disabled, onclick, children }: Props = $props()
</script>

<button class="btn {variant} {size}" {disabled} {onclick}>
  {@render children?.()}
</button>

<style>
  .btn {
    font-family: var(--font-sans);
    font-weight: 500;
    letter-spacing: -0.01em;
    border-radius: var(--r-md);
    border: 1px solid transparent;
    cursor: pointer;
    transition: background 140ms var(--ease-out), border-color 140ms var(--ease-out), transform 100ms var(--ease-spring);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .btn:active:not(:disabled) { transform: scale(0.97); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .sm { padding: 4px 10px; font-size: 12px; height: 26px; }
  .md { padding: 6px 12px; font-size: 13px; height: 32px; }

  .primary {
    background: var(--accent);
    color: white;
    box-shadow: 0 0 0 1px var(--accent), 0 6px 20px -8px var(--accent-glow);
  }
  .primary:hover:not(:disabled) { background: #ff3868; }

  .ghost {
    background: var(--bg-2);
    color: var(--fg-1);
    border-color: var(--line-2);
  }
  .ghost:hover:not(:disabled) { background: var(--bg-3); color: var(--fg-0); border-color: var(--line-3); }

  .danger { background: var(--danger); color: white; }
</style>
