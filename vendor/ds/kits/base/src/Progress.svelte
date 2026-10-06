<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { formatPercent, isDeterminate, normalizeRange } from "./progress.behavior";
  import { progress } from "./progress.variants";
  import type { Tone } from "./tone";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
    /** Omit the value for indeterminate work. */
    value?: number | null;
    /** Lower bound of the scale, exposed as `aria-valuemin`; defaults to `0`. */
    min?: number;
    /**
     * Upper bound of the scale, exposed as `aria-valuemax`; defaults to `100`. A `max` not above
     * `min` is widened to one unit.
     */
    max?: number;
    /** Complete accessible name for the progress bar. */
    label?: string;
    /** Show the label and normalized value beside the track. */
    summary?: boolean;
    /** Audible value text; receives the clamped value. */
    formatValue?: (value: number) => string;
    /** What the progress means: the shared tone vocabulary (ADR 0026). Defaults to `neutral` (ink). */
    tone?: Tone;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
  }

  const {
    value,
    min = 0,
    max = 100,
    label = "Progress",
    summary = false,
    formatValue,
    tone = "neutral",
    class: className,
    ...rest
  }: Props = $props();

  const determinate = $derived(isDeterminate(value));
  const range = $derived(normalizeRange(isDeterminate(value) ? value : min, min, max));
  const valueText = $derived(
    determinate ? (formatValue?.(range.value) ?? formatPercent(range)) : "In progress",
  );
  const slots = $derived(progress({ tone, indeterminate: !determinate }));
</script>

<div
  {...(rest as Record<string, unknown>)}
  data-progress
  data-state={determinate ? "determinate" : "indeterminate"}
  class={slots.root({ class: className })}
  role="progressbar"
  aria-label={label}
  aria-valuemin={range.min}
  aria-valuemax={range.max}
  aria-valuenow={determinate ? range.value : undefined}
  aria-valuetext={valueText}
>
  {#if summary}
    <div data-progress-summary class={slots.summary()} aria-hidden="true">
      <span class={slots.label()}>{label}</span>
      <span class={slots.value()}>{valueText}</span>
    </div>
  {/if}
  <div data-progress-track class={slots.track()} aria-hidden="true">
    <div
      data-progress-indicator
      class={slots.indicator()}
      style:width={determinate ? `${range.percent}%` : undefined}
    ></div>
  </div>
</div>
