<script lang="ts">
  // A quiet inline loading affordance — a spinning ring + optional label.
  // Honors `prefers-reduced-motion` (the spin is dropped when the user asks for
  // reduced motion). Pair with a surface while its data is in flight.
  interface Props {
    label?: string
    class?: string
  }
  let { label = 'Loading…', class: klass = '' }: Props = $props()
</script>

<div class="flex items-center justify-center gap-2 px-6 py-10 text-fg-2 {klass}">
  <span
    class="size-3.5 rounded-full border-2 border-line-2 border-t-fg-2 motion-safe:animate-spin"
    aria-hidden="true"
  ></span>
  {#if label}
    <span class="text-[12px]">{label}</span>
  {/if}
</div>
