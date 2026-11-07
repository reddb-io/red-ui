<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { audioLevel, audioWaveform } from "./core/audio";
  import { audioMeter } from "./audio-meter.variants";
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
    /** Linear input level from 0 (silence) to 1 (full scale), supplied by the host. */
    value: number;
    /** Accessible name and visible label. */
    label?: string;
    /** Show the current level or caller-supplied signed time-domain samples. */
    mode?: "level" | "waveform";
    /** Oldest to newest signed samples in -1 to 1; the host determines their time span. */
    samples?: readonly number[];
    /** Compact level display without visible label or number. */
    compact?: boolean;
    /** Extra classes on the root. */
    class?: string;
  }
  const { value, label = "Input level", mode = "level", samples = [], compact = false, class: className, ...rest }: Props = $props();
  const level = $derived(audioLevel(value));
  const slots = $derived(audioMeter({ compact }));
  const points = $derived(audioWaveform(samples));
</script>
<div {...rest} data-audio-meter data-mode={mode} class={slots.root({ class: className })} role="meter" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(level * 100)} aria-valuetext={`${Math.round(level * 100)}%`}>
  {#if !compact}<div class={slots.summary()} aria-hidden="true"><span>{label}</span><span class={slots.value()}>{Math.round(level * 100)}%</span></div>{/if}
  {#if mode === "waveform"}
    <svg class={slots.waveform()} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 50 H100" fill="none" stroke="currentColor" opacity="0.25" vector-effect="non-scaling-stroke"/><polyline {points} fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>
  {:else}
    <div class={slots.track()} aria-hidden="true">{#each Array(compact ? 6 : 20) as _, i (i)}<span data-audio-segment class={slots.segment({ class: level * (compact ? 6 : 20) > i ? i >= (compact ? 5 : 18) ? "bg-feedback-danger-foreground" : i >= (compact ? 4 : 15) ? "bg-feedback-warning-foreground" : "bg-feedback-success-foreground" : "" })}></span>{/each}</div>
  {/if}
</div>
