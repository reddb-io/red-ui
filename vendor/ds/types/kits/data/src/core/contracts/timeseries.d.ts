import type { ChartPalette } from "../chart-color";
import type { ColorToken } from "../chart-color";
import type { ChartTimestamp, ChartTimeRange } from "../../chart";
import type { TimeSeriesPoint, TimeSeriesDataset, TimeSeriesVariant } from "../../time-series";
import type { ChartNumberFormat, ChartCurve, ChartSeries, ChartSize, ChartLayout, ChartReadout, ChartHeight } from "../../chart";
import type { ChartLoading } from "../../chart-loading";
/** Portable TimeSeries properties shared by native adapters. */
export interface TimeSeriesContract {
    /** Exact continuous sample-axis viewport, shared between panels. Omitted, fits the supplied observations. Value scales still describe the supplied data. */
    timeRange?: ChartTimeRange;
    /** Linked inspection timestamp. Null clears the drawn cursor and reads the latest observation; omitted, inspection is local. The nearest retained observation supplies the exact reading. Bindable. */
    activeX?: ChartTimestamp | null;
    /** `roomy` preserves the original chrome; `dense` moves details over the plot; `auto` uses dense geometry in narrow containers. Every mode inherits Density spatial roles without selecting Theme or Density. */
    layout?: ChartLayout;
    /** `auto` follows layout: inline when roomy, otherwise overlaid during pointer/keyboard inspection. Explicit modes override placement independently. Hidden details remain in the explorer's accessible reading. */
    readout?: ChartReadout;
    /** Points as `{ x, y }`, or named datasets `{ id, label, data, series? }` sharing the same axes. Dataset ids preserve legend visibility across refreshes. */
    data: readonly TimeSeriesPoint[] | readonly TimeSeriesDataset[];
    /** Accessible description of the represented values. */
    label?: string;
    /** `line` reads its own range, `area` fills each series to zero, and `stacked-area` or `bar` stack named contributions around zero. Stacked areas leave a gap wherever any visible contribution is unavailable. */
    variant?: TimeSeriesVariant;
    /** `smooth` (default) uses monotone curves through observations; `linear` draws straight segments. Applies to lines and areas; bars are unchanged. */
    curve?: ChartCurve;
    /** `full` includes axes and a grid; `minimal` keeps only the plotted marks and removes their gutters. */
    presentation?: "full" | "minimal";
    /** Shared Density-relative plot height: three, six or ten control rows. An explicit `height` wins. Omitted, keeps the simple/interactive default. */
    size?: ChartSize;
    /** Stable dataset ids hidden from the plot. Bindable so a summary and its expanded view can share visibility. */
    hiddenSeries?: readonly string[];
    /** Renders a value-axis tick. Defaults to a locale-free number of at most two decimals. */
    format?: ChartNumberFormat;
    /** Formats time-axis ticks and the shared readout; omitted, Date axes use compact UTC labels, numeric axes retain the engine's formatter, and the readout uses exact UTC timestamps. */
    formatX?: (value: number | Date) => string;
    /** Exact shared value-axis bounds, e.g. `[0, 100]` for percentages. Omitted, follows all datasets. Must be finite and increasing; an area domain must include zero. */
    valueDomain?: readonly [
        number,
        number
    ];
    /** Show legend toggles and a shared pointer/keyboard readout. Defaults to true for named datasets, false for a simple point array. */
    interactive?: boolean;
    /** The Series Role (1–6) the series is drawn in. Never the Brand red. */
    series?: ChartSeries;
    /** Explicit color custom-property name; omitted, keeps the DS series role. */
    color?: ColorToken;
    /** Positive line/area outline width in drawing pixels; defaults to 2. */
    strokeWidth?: number;
    /** Dataset-id palette, overridden by a dataset color. */
    palette?: ChartPalette;
    /**
         * Fixed drawing width in px. Omitted, the series fills its figure's content
         * width and follows it on resize (640 until the figure is measured); the
         * container sets that width, and the chart never widens its container.
         */
    width?: number;
    /** Drawing height in pixels, or `fill` to consume a bounded parent panel. Omitted, inherits Density-relative sizing; dense/auto narrow layouts use six rows. */
    height?: ChartHeight;
    /**
         * When LayerChart loads: `lazy` (default) once the figure nears the viewport, `eager` as soon as
         * it mounts. Until then — and in the server render — the figure holds a placeholder of the
         * chart's own Density-sized height under its accessible name.
         */
    loading?: ChartLoading;
}
