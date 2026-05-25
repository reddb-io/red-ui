<script lang="ts" module>
  import { tv } from 'tailwind-variants'
  export const button = tv({
    base:
      'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium tracking-tight ' +
      'border border-transparent cursor-pointer transition-[background,border-color,color,box-shadow] duration-150 ' +
      'active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
    variants: {
      variant: {
        primary:
          'bg-accent text-white shadow-[0_0_0_1px_var(--color-accent),0_4px_14px_-4px_var(--color-accent-glow)] hover:bg-[#ff3868] hover:shadow-[0_0_0_1px_#ff3868,0_6px_18px_-4px_var(--color-accent-glow)]',
        ghost:
          'bg-bg-2 text-fg-1 border-line-2 hover:bg-bg-3 hover:text-fg-0 hover:border-line-3',
        danger:
          'bg-danger text-white hover:bg-[#ff6f88]',
      },
      size: {
        sm: 'h-6 px-2.5 text-[11px]',
        md: 'h-7 px-3 text-[12px]',
        lg: 'h-8 px-4 text-[13px]',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  })
</script>

<script lang="ts">
  interface Props {
    variant?: 'primary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
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
