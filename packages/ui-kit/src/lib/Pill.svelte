<script lang="ts" module>
  import { tv } from 'tailwind-variants'
  // A small meta chip for counts/labels next to a heading — quieter than Badge
  // (no uppercase/tracking), tuned for inline use beside a SectionHeading.
  export const pill = tv({
    base:
      'inline-flex items-center gap-1 px-1.5 h-[18px] rounded-full text-[11px] ' +
      'font-mono leading-none border',
    variants: {
      tone: {
        muted: 'bg-bg-2 text-fg-2 border-line-2',
        accent: 'bg-accent/15 text-accent border-accent/30',
      },
    },
    defaultVariants: { tone: 'muted' },
  })
</script>

<script lang="ts">
  interface Props {
    tone?: 'muted' | 'accent'
    class?: string
    children?: import('svelte').Snippet
  }
  let { tone = 'muted', class: klass = '', children }: Props = $props()
</script>

<span class={pill({ tone, class: klass })}>{@render children?.()}</span>
