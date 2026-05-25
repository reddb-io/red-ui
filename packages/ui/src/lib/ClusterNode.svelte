<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte'

  interface Props {
    data: {
      label: string
      role: string
      collections: number
      entities: number
      url: string
    }
    selected?: boolean
  }
  let { data, selected }: Props = $props()

  const roleClass = $derived(
    data.role === 'primary' ? 'role-primary' :
    data.role === 'replica' ? 'role-replica' :
    'role-embedded'
  )
</script>

<Handle type="target" position={Position.Left} style="opacity:0;pointer-events:none" />
<Handle type="source" position={Position.Right} style="opacity:0;pointer-events:none" />

<div class="card {roleClass}" class:selected>
  <div class="stripe"></div>
  <div class="body">
    <div class="head">
      <span class="role">{data.role}</span>
      <span class="dot"></span>
    </div>
    <div class="label">{data.label}</div>
    <div class="meta">
      <span class="metric"><span class="n">{data.collections}</span><span class="u">colls</span></span>
      <span class="sep">·</span>
      <span class="metric"><span class="n">{data.entities.toLocaleString()}</span><span class="u">entities</span></span>
    </div>
  </div>
</div>

<style>
  .card {
    --c: #7a8088;
    position: relative;
    width: 240px;
    background: var(--color-bg-1);
    border: 1px solid var(--color-line-2);
    border-radius: 8px;
    overflow: hidden;
    transition: border-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out), transform 200ms var(--ease-spring);
    cursor: pointer;
  }
  .card:hover {
    border-color: color-mix(in srgb, var(--c) 50%, var(--color-line-3));
  }
  .card.selected {
    border-color: var(--c);
    box-shadow: 0 0 0 1px var(--c), 0 8px 28px -8px color-mix(in srgb, var(--c) 60%, transparent);
  }

  .role-primary  { --c: var(--color-role-primary); }
  .role-replica  { --c: var(--color-role-replica); }
  .role-embedded { --c: var(--color-role-embedded); }

  .stripe {
    position: absolute; left: 0; top: 0; bottom: 0;
    width: 2px;
    background: var(--c);
    box-shadow: 0 0 8px var(--c);
  }

  .body { padding: 12px 14px 12px 16px; }

  .head { display: flex; align-items: center; justify-content: space-between; }
  .role {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--c);
  }
  .dot {
    width: 6px; height: 6px;
    border-radius: 9999px;
    background: var(--c);
    box-shadow: 0 0 6px var(--c);
    animation: pulse 2.4s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.9); }
  }

  .label {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    color: var(--color-fg-0);
    margin-top: 4px;
    letter-spacing: -0.01em;
  }

  .meta {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--color-line-1);
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .metric { display: inline-flex; align-items: baseline; gap: 4px; }
  .metric .n { color: var(--color-fg-0); font-weight: 500; }
  .metric .u { color: var(--color-fg-3); font-size: 10px; }
  .sep { color: var(--color-fg-3); }
</style>
