<script lang="ts">
  import { Pill } from '@reddb-io/design-system/app'
  import type { ComponentProps } from 'svelte'
  import { resolveTone, type LegacyTone } from './tone'

  type Props = Omit<ComponentProps<typeof Pill>, 'tone'> & { tone?: LegacyTone }
  let { tone = 'neutral', ...rest }: Props = $props()
</script>

<Pill {...rest} tone={resolveTone(tone)} />
