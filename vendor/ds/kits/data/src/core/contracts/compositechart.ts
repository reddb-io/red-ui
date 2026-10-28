import type { ChartTimestamp, ChartTimeRange } from "../../chart";
import type { ChartSize, ChartLayout, ChartReadout, ChartHeight } from "../../chart";
import type { ChartLoading } from "../../chart-loading";
import type { CompositeOptions, CompositeAxis, CompositeChartSeries, CompositeReference, CompositeX } from "../composite-chart";

/** Portable mixed-chart properties shared by native Svelte and React adapters. */
export interface CompositeChartContract extends CompositeOptions {
  /** Exact continuous sample-axis viewport, shared between panels. Omitted, fits the supplied observations. Value scales still describe the supplied data. */
  timeRange?: ChartTimeRange;
  /** Linked inspection timestamp. Null clears the drawn cursor and reads the latest observation; omitted, inspection is local. The nearest retained observation supplies the exact reading. Bindable. */
  activeX?: ChartTimestamp | null;

  /** `roomy` preserves the original chrome; `dense` moves details over the plot; `auto` uses dense geometry in narrow containers. Every mode inherits Density spatial roles without selecting Theme or Density. */
  layout?: ChartLayout;
  /** `auto` follows layout: inline when roomy, otherwise overlaid during pointer/keyboard inspection. Explicit modes override placement independently. Hidden details remain in the explorer's accessible reading. */
  readout?: ChartReadout;
  /** Named layers drawn in array order, or by ascending `order`. Stable ids preserve visibility across updates. */
  data: readonly CompositeChartSeries[];
  /** Visible chart name and accessible name of its plot and maximized view. */
  label: string;
  /** `vertical` combines columns and lines; `horizontal` combines bars and lines. Candles require vertical orientation. */
  orientation?: "vertical" | "horizontal";
  /** Primary value-axis name, formatter and optional exact domain. Columns and areas require domains containing zero. */
  primaryAxis?: CompositeAxis;
  /** Required and visibly named when a series uses the independent secondary value scale. */
  secondaryAxis?: CompositeAxis;
  /** Application-owned reference levels or sample markers. They are clipped to the plot and do not expand domains. */
  references?: readonly CompositeReference[];
  /** Formats sample-axis ticks and the exact shared readout. Defaults to UTC for Dates and literal category/number labels. */
  formatX?: (value: CompositeX) => string;
  /** `full` shows axes and grid; `minimal` removes both and their gutters. */
  presentation?: "full" | "minimal";
  /** `compact` places small series toggles beside the chart controls; `hidden` omits the legend. */
  legend?: "compact" | "hidden";
  /** Enable the shared pointer and keyboard cursor and value readout. */
  interactive?: boolean;
  /** Stable series ids omitted from drawing and readout. Domains remain stable while toggling visibility. Bindable. */
  hiddenSeries?: readonly string[];
  /** Offer a maximized, viewport-filling view with keyboard dismissal and focus return. */
  expandable?: boolean;
  /** Bindable visibility of the maximized view. Uses the same hidden series and active sample as the inline plot. */
  expanded?: boolean;
  /** Visible label for the maximize action. */
  expandLabel?: string;
  /** Visible label for returning from the maximized view. */
  restoreLabel?: string;
  /** Density-relative plot height of three, six or ten rows. Omitted, roomy uses ten rows and dense uses six; auto adapts to container width. An explicit height wins. */
  size?: ChartSize;
  /** Drawing height in pixels, or `fill` to consume a bounded parent panel while accounting for legend/readout chrome. The maximized drawing always fills its available region. */
  height?: ChartHeight;
  /** Load the drawing near the viewport, or eagerly on mount. SSR retains the named, Density-sized placeholder. */
  loading?: ChartLoading;
}
