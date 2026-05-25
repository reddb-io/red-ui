<script lang="ts">
  type Role = 'primary' | 'replica' | 'embedded'
  interface Props { role: Role; label?: string }
  let { role, label }: Props = $props()
</script>

<span class="node {role}">
  <span class="dot"></span>
  <span class="label">{label ?? role}</span>
</span>

<style>
  .node {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-1);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .dot {
    width: 6px; height: 6px; border-radius: 9999px;
    box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 20%, transparent);
  }
  .primary .dot { background: var(--role-primary); color: var(--role-primary); }
  .replica .dot { background: var(--role-replica); color: var(--role-replica); }
  .embedded .dot { background: var(--role-embedded); color: var(--role-embedded); }
</style>
