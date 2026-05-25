<script lang="ts" module>
  import { tv } from 'tailwind-variants'
  export const badge = tv({
    base:
      'inline-flex items-center px-1.5 py-px rounded-full text-[10px] font-medium ' +
      'font-mono uppercase tracking-[0.06em] border',
    variants: {
      tone: {
        neutral: 'bg-bg-2 text-fg-2 border-line-2',
        ok: 'bg-ok/15 text-ok border-ok/30',
        warn: 'bg-warn/15 text-warn border-warn/30',
        danger: 'bg-danger/15 text-danger border-danger/30',
        info: 'bg-info/15 text-info border-info/30',
        accent: 'bg-accent/15 text-accent border-accent/30',
      },
    },
    defaultVariants: { tone: 'neutral' },
  })
</script>

<script lang="ts">
  interface Props {
    tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'accent'
    class?: string
    children?: import('svelte').Snippet
  }
  let { tone = 'neutral', class: klass = '', children }: Props = $props()
</script>

<span class={badge({ tone, class: klass })}>{@render children?.()}</span>
