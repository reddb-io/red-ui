<script lang="ts">
  import { Button } from '@reddb-io/design-system/base'
  import type { Snippet } from 'svelte'
  import type { Tone } from '@reddb-io/design-system/base'

  // Temporary facade: the published ui-kit API called a destructive fill a variant.
  interface Props {
    variant?: 'primary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    tone?: Tone
    disabled?: boolean
    onclick?: (event: MouseEvent) => void
    class?: string
    children?: Snippet
  }
  let { variant = 'ghost', tone, ...rest }: Props = $props()
</script>

<Button {...rest} variant={variant === 'danger' ? 'primary' : variant} tone={variant === 'danger' ? 'danger' : tone} />
