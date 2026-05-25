<script lang="ts">
  interface Props {
    tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'accent'
    children?: import('svelte').Snippet
  }
  let { tone = 'neutral', children }: Props = $props()
</script>

<span class="badge {tone}">{@render children?.()}</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 1px 7px;
    border-radius: 9999px;
    font-size: 10px;
    font-weight: 500;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border: 1px solid transparent;
  }
  .neutral { background: var(--bg-2); color: var(--fg-2); border-color: var(--line-2); }
  .ok { background: color-mix(in srgb, var(--ok) 14%, transparent); color: var(--ok); border-color: color-mix(in srgb, var(--ok) 30%, transparent); }
  .warn { background: color-mix(in srgb, var(--warn) 14%, transparent); color: var(--warn); border-color: color-mix(in srgb, var(--warn) 30%, transparent); }
  .danger { background: color-mix(in srgb, var(--danger) 14%, transparent); color: var(--danger); border-color: color-mix(in srgb, var(--danger) 30%, transparent); }
  .info { background: color-mix(in srgb, var(--info) 14%, transparent); color: var(--info); border-color: color-mix(in srgb, var(--info) 30%, transparent); }
  .accent { background: var(--accent-soft); color: var(--accent); border-color: color-mix(in srgb, var(--accent) 30%, transparent); }
</style>
