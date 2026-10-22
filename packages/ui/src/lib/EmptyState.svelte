<script lang="ts">
  import { EmptyState, Icon } from '@reddb-io/design-system/base'
  import type { ComponentProps, Snippet } from 'svelte'

  interface Props {
    title: string
    message?: string
    icon?: ComponentProps<typeof Icon>['icon']
    hint?: string
    actions?: Snippet
  }
  let { title, message, icon, hint, actions }: Props = $props()
</script>

<EmptyState {title} description={message} {hint} {actions}>
  {#snippet media()}
    {#if icon}<Icon {icon} size="lg" />{/if}
  {/snippet}
</EmptyState>
