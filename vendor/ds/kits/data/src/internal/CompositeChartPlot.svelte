<script lang="ts">
  import { formatChartNumber } from "../chart";
  import { ChartCore as Chart, Svg } from "layerchart/svg";
  import { compositeGeometry, compositeColumnLabel } from "../core/composite-geometry";
  import type { CompositeLayout, CompositeModel } from "../core/composite-chart";
  interface Props {
    model: CompositeModel;
    layout: CompositeLayout;
    hiddenSeries: readonly string[];
    cursor?: number;
    presentation: "full" | "minimal";
  }
  const { model, layout, hiddenSeries, cursor, presentation }: Props = $props();
  const geometry = $derived(compositeGeometry(model, layout, hiddenSeries));
  const uid = $props.id();
  const clipId = `${uid}-plot`;
</script>

<Chart ssr width={layout.width} height={layout.height} padding={layout.padding}
  xDomain={layout.horizontal ? model.primaryDomain : model.sampleDomain}
  yDomain={layout.horizontal ? model.sampleDomain : model.primaryDomain}
  xNice={false} yNice={false} tooltipContext={false}>
  <Svg aria-hidden="true">
    <defs><clipPath id={clipId}><rect width={layout.plotWidth} height={layout.plotHeight} /></clipPath></defs>
    {#if presentation === "full"}
      <g data-chart-grid stroke="var(--reddb-color-muted)">
        {#each layout.primaryTicks as tick}
          <line x1={layout.horizontal ? tick.position : 0} x2={layout.horizontal ? tick.position : layout.plotWidth}
            y1={layout.horizontal ? 0 : tick.position} y2={layout.horizontal ? layout.plotHeight : tick.position} />
        {/each}
      </g>
    {/if}
    <g clip-path={`url(#${clipId})`}>
      {#each geometry.layers as layer (layer.id)}
        <g data-composite-layer={layer.id} data-composite-kind={layer.kind} data-composite-axis={layer.axis}>
          {#if layer.fill}<path d={layer.fill} fill={layer.paint} fill-opacity={0.2} />{/if}
          {#each layer.rects as rect}<rect {...rect} fill={rect.paint ?? layer.paint} data-composite-column />{/each}
          {#if model.options?.dataLabels === "value"}
            {#each layer.rects as rect}
              {@const reading = compositeColumnLabel(rect, layout, model.options.columnMode === "stacked", layer.format ?? formatChartNumber)}
              {#if reading.visible}<text data-column-label x={reading.x} y={reading.y} text-anchor="middle" dominant-baseline="middle" fill="var(--reddb-color-foreground)" stroke="var(--reddb-color-background)" stroke-width="3" paint-order="stroke" class="text-xs">{reading.text}</text>{/if}
            {/each}
          {/if}
          {#each layer.candles as candle (candle.key)}
            <g data-candle={candle.direction} stroke-width={model.options?.strokeWidth ?? 1}>
              <line x1={candle.center} x2={candle.center} y1={candle.high} y2={candle.low} stroke={layer.paint} />
              {#if candle.direction === "flat"}
                <line x1={candle.x} x2={candle.x + candle.width} y1={candle.y} y2={candle.y} stroke={layer.paint} />
              {:else}
                <rect x={candle.x} y={candle.y} width={candle.width} height={candle.height} stroke={layer.paint}
                  fill={candle.direction === "up" ? "var(--reddb-color-background)" : layer.paint} />
              {/if}
            </g>
          {/each}
          {#if layer.path}<path d={layer.path} fill="none" stroke={layer.paint} stroke-width={model.options?.strokeWidth ?? 1.5} stroke-dasharray={layer.dash} />{/if}
        </g>
      {/each}
      {#each geometry.references as reference (reference.id)}
        <line data-composite-reference={reference.id} x1={reference.x1} x2={reference.x2} y1={reference.y1} y2={reference.y2}
          stroke={reference.paint} stroke-dasharray="4 3"><title>{reference.label}</title></line>
      {/each}
      {#if cursor !== undefined}
        {@const position = geometry.cursor(cursor)}
        <line data-chart-cursor x1={layout.horizontal ? 0 : position} x2={layout.horizontal ? layout.plotWidth : position}
          y1={layout.horizontal ? position : 0} y2={layout.horizontal ? position : layout.plotHeight}
          stroke="var(--reddb-color-ink-muted)" stroke-dasharray="3 3" />
      {/if}
    </g>
    {#if model.options?.showTotals}{#each geometry.totals.filter(total => layout.horizontal || layout.plotWidth * model.interval / (model.sampleDomain[1] - model.sampleDomain[0]) > (total.format ?? formatChartNumber)(total.value).length * 7 + 4) as total}<text data-stack-total stroke="var(--reddb-color-background)" stroke-width="3" paint-order="stroke" x={total.x} y={Math.min(layout.plotHeight - 8, Math.max(-14, total.y + (total.value >= 0 ? -6 : 14)))} text-anchor="middle" fill="var(--reddb-color-foreground)" class="text-xs">{(total.format ?? formatChartNumber)(total.value)}</text>{/each}{/if}
    {#if presentation === "full"}
      <g data-composite-axis="sample" fill="var(--reddb-color-ink-muted)" class="text-xs font-regular">
        {#each layout.sampleTicks as tick}
          <text x={layout.horizontal ? -6 : tick.position} y={layout.horizontal ? tick.position : layout.plotHeight + 17}
            transform={!layout.horizontal && model.options?.categoryLabelAngle ? `rotate(${model.options.categoryLabelAngle},${tick.position},${layout.plotHeight + 17})` : undefined} text-anchor={layout.horizontal || model.options?.categoryLabelAngle ? "end" : "middle"} dominant-baseline={layout.horizontal ? "middle" : "auto"}>{tick.label}</text>
        {/each}
      </g>
      <g data-composite-axis="primary" fill="var(--reddb-color-ink-muted)" class="text-xs font-regular">
        {#each layout.primaryTicks as tick}
          <text x={layout.horizontal ? tick.position : -6} y={layout.horizontal ? layout.plotHeight + 17 : tick.position}
            text-anchor={layout.horizontal ? "middle" : "end"} dominant-baseline={layout.horizontal ? "auto" : "middle"}>{tick.label}</text>
        {/each}
      </g>
      <g data-composite-axis="secondary" fill="var(--reddb-color-ink-muted)" class="text-xs font-regular">
        {#each layout.secondaryTicks as tick}
          <text x={layout.horizontal ? tick.position : layout.plotWidth + 6} y={layout.horizontal ? -8 : tick.position}
            text-anchor={layout.horizontal ? "middle" : "start"} dominant-baseline={layout.horizontal ? "auto" : "middle"}>{tick.label}</text>
        {/each}
      </g>
    {/if}
  </Svg>
</Chart>
