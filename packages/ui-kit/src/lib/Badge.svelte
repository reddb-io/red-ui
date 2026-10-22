<script lang="ts">
  import { Badge } from '@reddb-io/design-system/base'
  import type { ComponentProps } from 'svelte'
  import { resolveTone, type LegacyTone } from './tone'

  type Props = Omit<ComponentProps<typeof Badge>, 'tone'> & { tone?: LegacyTone }
  let { tone = 'neutral', ...rest }: Props = $props()
</script>

<Badge {...rest} tone={resolveTone(tone)} />
