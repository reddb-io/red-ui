<script lang="ts">
  import { EmptyState } from '@reddb-io/design-system/base'
  import type { ComponentProps, Snippet } from 'svelte'

  type Props = ComponentProps<typeof EmptyState> & { icon?: Snippet; action?: Snippet }
  let { icon, action, media = icon, actions = action, bordered = false, ...rest }: Props = $props()
</script>

<EmptyState {...rest} {media} {actions} {bordered} />
