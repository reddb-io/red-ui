<script lang="ts">
  import { Card } from '@reddb-io/design-system/base'
  import type { ComponentProps } from 'svelte'

  type Props = ComponentProps<typeof Card> & { floating?: boolean }
  let { floating = false, raised = floating, ...rest }: Props = $props()
</script>

<Card {...rest} {raised} />
