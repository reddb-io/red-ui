<script lang="ts">
  import { EmptyState, Icon, StateIllustration } from '@reddb-io/design-system/base'
  import type { StateIllustrationAsset } from '@reddb-io/design-system/base/illustrations'
  import type { ComponentProps, Snippet } from 'svelte'

  interface Props {
    title: string
    message?: string
    icon?: ComponentProps<typeof Icon>['icon']
    illustration?: StateIllustrationAsset
    illustrationSize?: ComponentProps<typeof StateIllustration>['size']
    hint?: string
    actions?: Snippet
  }
  let { title, message, icon, illustration, illustrationSize = 'md', hint, actions }: Props = $props()
</script>

<EmptyState {title} description={message} {hint} {actions} bordered={!illustration}>
  {#snippet media()}
    {#if illustration}
      <StateIllustration art={illustration} size={illustrationSize} />
    {:else if icon}<Icon {icon} size="lg" />{/if}
  {/snippet}
</EmptyState>
