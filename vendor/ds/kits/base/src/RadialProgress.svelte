<script lang="ts">
  import type { Snippet } from "svelte";
  import { ringThickness, type RadialReading } from "./core/radial";
  import { tokenColor, type ColorToken } from "./core/color-token";
  import type { HTMLAttributes } from "svelte/elements";
  import { formatPercent, isDeterminate, normalizeRange } from "./progress.behavior";
  import {
    radialProgress,
    type RadialProgressSize,
  } from "./radial-progress.variants";
  import type { Tone } from "./tone";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
    /** Omit the value for an indeterminate radial indicator. */
    value?: number | null;
    /** Lower bound of the scale, exposed as `aria-valuemin`; defaults to `0`. */
    min?: number;
    /**
     * Upper bound of the scale, exposed as `aria-valuemax`; defaults to `100`. A `max` not above
     * `min` is widened to one unit.
     */
    max?: number;
    /** Accessible name of the progress indicator; defaults to `Progress`. */
    label?: string;
    /**
     * Diameter of the ring, following the Density control heights: `sm`, `md` or `lg`. Defaults
     * to `md`.
     */
    size?: RadialProgressSize;
    /**
     * Formats the clamped value for the centered text and `aria-valuetext`; defaults to a rounded
     * percentage.
     */
    formatValue?: (value: number) => string;
    /** What the progress means: the shared tone vocabulary (ADR 0026). Defaults to `neutral` (ink). */
    tone?: Tone;
    /** Ring width as a fraction of outer radius, strictly between zero and one. Defaults to the original three-unit stroke. */
    thickness?: number;
    /** Color custom-property name; omitted, uses tone. */
    color?: ColorToken;
    /** Explicit diameter in pixels; omitted, follows size and Density. */
    diameter?: number;
    /** Noninteractive content replacing the default centered percentage. */
    center?: Snippet<[RadialReading]>;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
  }

  const {
    value,
    min = 0,
    max = 100,
    label = "Progress",
    size = "md",
    formatValue,
    tone = "neutral", thickness = 3 / 17, color, diameter, center,
    class: className,
    ...rest
  }: Props = $props();

  const stroke = $derived(ringThickness(thickness) * 17);
  const paint = $derived(tokenColor(color, "currentColor"));
  const determinate = $derived(isDeterminate(value));
  const range = $derived(normalizeRange(isDeterminate(value) ? value : min, min, max));
  const reading = $derived({ value: range.value, percent: range.percent, determinate });
  const valueText = $derived(
    determinate ? (formatValue?.(range.value) ?? formatPercent(range)) : "In progress",
  );
  const slots = $derived(radialProgress({ size, tone, indeterminate: !determinate }));
</script>

<div
  {...(rest as Record<string, unknown>)}
  data-radial-progress
  data-state={determinate ? "determinate" : "indeterminate"}
  class={slots.root({ class: className })}
  style:width={diameter === undefined ? undefined : `${diameter}px`}
  style:height={diameter === undefined ? undefined : `${diameter}px`}
  role="progressbar"
  aria-label={label}
  aria-valuemin={range.min}
  aria-valuemax={range.max}
  aria-valuenow={determinate ? range.value : undefined}
  aria-valuetext={valueText}
>
  <svg class={slots.svg()} viewBox="0 0 36 36" aria-hidden="true">
    <circle class={slots.track()} cx="18" cy="18" r={17 - stroke / 2} stroke-width={stroke} />
    <circle
      class={slots.indicator()}
      style:stroke={color ? paint : undefined}
      cx="18"
      cy="18"
      r={17 - stroke / 2}
      pathLength="100"
      stroke-width={stroke}
      stroke-linecap="round"
      stroke-dasharray={determinate ? 100 : 25}
      stroke-dashoffset={determinate ? 100 - range.percent : 0}
    />
  </svg>
  {#if center}<div data-radial-center class="absolute grid place-items-center overflow-hidden" style:width={`${(1 - thickness) * 94}%`} style:height={`${(1 - thickness) * 94}%`}>{@render center(reading)}</div>{:else}<span class={slots.value()}>{valueText}</span>{/if}
</div>
