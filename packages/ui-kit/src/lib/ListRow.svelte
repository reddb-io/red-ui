<script lang="ts">
  // A settings/governance row: a `title` (+ optional `description` and a mono
  // `hint`) on the left, a right-aligned `action` slot, and an optional `below`
  // slot that spans the row's full width (for inline editors, diffs, warnings).
  //
  // `wide` flips the layout to a stacked variant: the label block sits on top
  // and the action drops to its own full-width line beneath — for actions that
  // are too large to sit inline (a long input, a segmented control).
  import type { Snippet } from 'svelte'

  interface Props {
    title: string
    /** Secondary line under the title. */
    description?: string
    /** Mono hint — a value, key, or id rendered in the data typeface. */
    hint?: string
    /** Right-aligned (inline) or full-width-below (wide) action. */
    action?: Snippet
    /** Full-width content beneath the row — editors, diffs, warnings. */
    below?: Snippet
    /** Stack the action beneath the label block instead of inline-right. */
    wide?: boolean
    class?: string
  }
  let {
    title,
    description,
    hint,
    action,
    below,
    wide = false,
    class: klass = '',
  }: Props = $props()
</script>

<div
  data-wide={wide ? '' : undefined}
  class={[
    'px-3 py-2.5',
    wide ? 'flex flex-col gap-2' : 'flex items-center gap-3',
    klass,
  ].join(' ')}
>
  <div class={['flex min-w-0 items-baseline gap-2', wide ? '' : 'flex-1'].join(' ')}>
    <div class="min-w-0">
      <div class="flex items-baseline gap-2">
        <span class="truncate text-[13px] text-fg-0">{title}</span>
        {#if hint}
          <span class="shrink-0 font-mono text-[11px] text-fg-2">{hint}</span>
        {/if}
      </div>
      {#if description}
        <p class="mt-0.5 text-[12px] leading-snug text-fg-2">{description}</p>
      {/if}
    </div>
  </div>

  {#if action}
    <div class={['flex items-center gap-2', wide ? 'w-full' : 'shrink-0'].join(' ')}>
      {@render action()}
    </div>
  {/if}

  {#if below}
    <div class="w-full">{@render below()}</div>
  {/if}
</div>
