import type { ChartTimestamp, ChartTimeRange } from "../chart";

/** Validate a caller-owned continuous sample-axis viewport. */
export function chartTimeRange(range: ChartTimeRange | undefined): [number, number] | undefined {
  if (range === undefined) return undefined;
  const low = +range[0], high = +range[1];
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low || !Number.isFinite(high - low)) {
    throw new Error("Chart: timeRange must contain finite, increasing timestamps.");
  }
  return [low, high];
}

/** Nearest retained observation by timestamp; an unset cursor reads the latest. */
export function chartTimeIndex<T>(samples: readonly T[], active: ChartTimestamp | null | undefined, timestamp: (sample: T) => number): number {
  if (active == null || !Number.isFinite(+active)) return Math.max(0, samples.length - 1);
  let low = 0, high = samples.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (timestamp(samples[middle]!) < +active) low = middle + 1;
    else high = middle;
  }
  return low > 0 && Math.abs(timestamp(samples[low - 1]!) - +active) <= Math.abs(timestamp(samples[low]!) - +active) ? low - 1 : low;
}

/** A linked cursor only draws inside the visible continuous domain. */
export function chartCursor(active: ChartTimestamp | null | undefined, domain: readonly [number, number]): number | undefined {
  const value = active == null ? NaN : +active;
  return Number.isFinite(value) && value >= domain[0] && value <= domain[1] ? value : undefined;
}

/** Only draw the visible sorted window plus two neighbours at each edge.
 * Neighbours preserve clipped segments and monotone tangents without repainting retained history.
 */
export function chartWindowPoints<T>(points: readonly T[], domain: readonly [number, number], timestamp: (point: T) => number): readonly T[] {
  function bound(value: number, upper: boolean) {
    let low = 0, high = points.length;
    while (low < high) {
      const middle = (low + high) >>> 1, time = timestamp(points[middle]!);
      if (time < value || upper && time === value) low = middle + 1;
      else high = middle;
    }
    return low;
  }
  const first = Math.max(0, bound(domain[0], false) - 2), last = Math.min(points.length, bound(domain[1], true) + 2);
  return first === 0 && last === points.length ? points : points.slice(first, last);
}
