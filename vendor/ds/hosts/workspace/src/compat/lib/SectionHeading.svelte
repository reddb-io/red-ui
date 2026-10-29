<script lang="ts">
  import { SectionHeading } from '@reddb-io/design-system/base'
  import type { ComponentProps, Snippet } from 'svelte'

  type Props = ComponentProps<typeof SectionHeading> & { icon?: Snippet; meta?: Snippet }
  let { icon, meta, actions = meta, rule = false, size = 'sm', class: klass, ...rest }: Props = $props()
</script>

<div class="flex items-center gap-[var(--reddb-spatial-gap-md)] {klass ?? ''}">
  {#if icon}<span aria-hidden="true" class="text-ink-muted">{@render icon()}</span>{/if}
  <SectionHeading {...rest} {actions} {rule} {size} class="min-w-0 flex-1" />
</div>
