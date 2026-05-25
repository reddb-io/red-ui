<script lang="ts" module>
  import { tv } from 'tailwind-variants'
  export const button = tv({
    base:
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium tracking-tight ' +
      'border border-transparent cursor-pointer transition-colors ' +
      'active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed',
    variants: {
      variant: {
        primary:
          'bg-accent text-white shadow-[0_0_0_1px_var(--color-accent),0_6px_20px_-8px_var(--color-accent-glow)] hover:bg-[#ff3868]',
        ghost:
          'bg-bg-2 text-fg-1 border-line-2 hover:bg-bg-3 hover:text-fg-0 hover:border-line-3',
        danger: 'bg-danger text-white',
      },
      size: {
        sm: 'h-[26px] px-2.5 text-xs',
        md: 'h-8 px-3 text-[13px]',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  })
</script>

<script lang="ts">
  interface Props {
    variant?: 'primary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
    disabled?: boolean
    onclick?: (e: MouseEvent) => void
    class?: string
    children?: import('svelte').Snippet
  }
  let { variant = 'ghost', size = 'md', disabled, onclick, class: klass = '', children }: Props = $props()
</script>

<button class={button({ variant, size, class: klass })} {disabled} {onclick}>
  {@render children?.()}
</button>
