<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { warnDeprecated } from "./deprecation";
  import { meter, type DeprecatedMeterTone, type MeterTone } from "./meter.variants";
  import { formatPercent, normalizeRange } from "./progress.behavior";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
    /**
     * The measured reading, clamped into `min` through `max`; becomes `aria-valuenow` and drives
     * the fill width.
     */
    value: number;
    /** Lower bound of the scale, exposed as `aria-valuemin`; defaults to `0`. */
    min?: number;
    /**
     * Upper bound of the scale, exposed as `aria-valuemax`; defaults to `100`. A `max` not above
     * `min` is widened to one unit.
     */
    max?: number;
    /** Accessible name of the meter, also shown beside the reading; defaults to `Meter`. */
    label?: string;
    /**
     * Formats the clamped value for the visible reading and `aria-valuetext`; defaults to a
     * rounded percentage.
     */
    formatValue?: (value: number) => string;
    /**
     * What the fill means: the shared tone vocabulary (ADR 0026), ink when
     * `neutral` (the default). `primary` is deprecated for one release.
     */
    tone?: MeterTone | DeprecatedMeterTone;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
  }

  const {
    value,
    min = 0,
    max = 100,
    label = "Meter",
    formatValue,
    tone = "neutral",
    class: className,
    ...rest
  }: Props = $props();

  const range = $derived(normalizeRange(value, min, max));
  const valueText = $derived(formatValue?.(range.value) ?? formatPercent(range));
  const slots = $derived(meter({ tone }));

  $effect(() => {
    if (tone === "primary") {
      warnDeprecated("Meter", 'tone="primary"', 'tone="neutral" (ink) or the Feedback Role the reading means');
    }
  });
</script>

<div
  {...(rest as Record<string, unknown>)}
  data-meter
  data-tone={tone}
  class={slots.root({ class: className })}
  role="meter"
  aria-label={label}
  aria-valuemin={range.min}
  aria-valuemax={range.max}
  aria-valuenow={range.value}
  aria-valuetext={valueText}
>
  <div data-meter-summary class={slots.summary()} aria-hidden="true">
    <span class={slots.label()}>{label}</span>
    <span class={slots.value()}>{valueText}</span>
  </div>
  <div data-meter-track class={slots.track()} aria-hidden="true">
    <div
      data-meter-indicator
      class={slots.indicator()}
      style:width={`${range.percent}%`}
    ></div>
  </div>
</div>
