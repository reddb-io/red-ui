<script module lang="ts">
  export type { ActivityTimelineEvent, ActivityTimelineRow } from "./activity-timeline";
</script>
<script lang="ts">
  import { Button } from "@reddb-io/design-system/base";
  import { activityTimelineModel, type ActivityTimelineRow } from "./activity-timeline";
  import { activityTimeline } from "./activity-timeline.variants";
  interface Props {
    /** Accessible title for the timeline. */
  label: string;
    /** Activities and their child event intervals. */
  rows: readonly ActivityTimelineRow[];
    /** Optional finite, increasing time bounds. */
  domain?: readonly [number, number];
    /** Formats exact event times in the accessible list. */
  formatTime?: (value: number) => string;
    /** Visible text for the scroll control. */
  endLabel?: string;
    /** Additional outer classes. */
  class?: string;
  }
  let { label, rows, domain, formatTime = String, endLabel = "Scroll to end", class: className = "" }: Props = $props();
  let viewport: HTMLDivElement;
  const model = $derived(activityTimelineModel(rows, domain));
  const styles = activityTimeline();
</script>
<section data-activity-timeline aria-label={label} class={styles.root({class: className})}>
  <!-- Named scroll regions are keyboard reachable. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div bind:this={viewport} class={styles.scroll()} tabindex="0" role="region" aria-label={`${label} timeline`}>
    <ol class={styles.rows()}>
      {#each model.rows as row (row.id)}
        <li class={styles.row()}>
          <div class={styles.header()}><p class={styles.title()}>{row.label}{#if row.context}<span class="font-regular text-ink-muted">{" · "}{row.context}</span>{/if}</p>{#if row.value}<span class="text-body tabular-nums">{row.value}</span>{/if}</div>
          <div class={styles.header()}><p class={styles.meta()}>{row.summary ?? ""}</p>{#if row.detail}<p class={styles.meta()}>{row.detail}</p>{/if}</div>
          <div data-activity-track aria-hidden="true" class={styles.track()} style:height={`calc(var(--reddb-spatial-gap-md) * ${Math.max(1, ...row.events.map(event => event.lane + 1))})`}>
            {#each row.events as event (event.id)}<span data-activity-event={event.id} class={styles.event()} style:left={`${event.left}%`} style:width={event.start === event.end ? "1px" : `${event.width}%`} style:top={`calc(var(--reddb-spatial-gap-md) * ${event.lane})`} style:height="var(--reddb-spatial-gap-sm)" style:background={`var(--reddb-color-series-${event.series ?? 1})`}></span>{/each}
          </div>
          <ul class="sr-only">{#each row.events as event (event.id)}<li>{event.label}: {formatTime(event.start)} – {formatTime(event.end)}</li>{/each}</ul>
        </li>
      {/each}
    </ol>
  </div>
  <div class={styles.action()}><Button variant="ghost" size="sm" onclick={() => viewport?.scrollTo({left: viewport.scrollWidth})}>{endLabel}</Button></div>
</section>
