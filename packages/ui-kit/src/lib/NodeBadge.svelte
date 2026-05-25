<script lang="ts">
  type Role = 'primary' | 'replica' | 'embedded'
  interface Props { role: Role; label?: string }
  let { role, label }: Props = $props()

  const dotColor = $derived(
    ({
      primary: 'bg-role-primary text-role-primary',
      replica: 'bg-role-replica text-role-replica',
      embedded: 'bg-role-embedded text-role-embedded',
    } as const)[role]
  )
</script>

<span class="inline-flex items-center gap-1.5 font-mono text-[11px] text-fg-1 uppercase tracking-[0.06em]">
  <span class="w-1.5 h-1.5 rounded-full {dotColor} shadow-[0_0_0_3px_currentColor]/20"></span>
  <span>{label ?? role}</span>
</span>
