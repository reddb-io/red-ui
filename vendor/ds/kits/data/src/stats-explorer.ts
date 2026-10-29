/** A caller-supplied numeric measurement. */
export interface StatsMetric {
  /** Stable measurement key. */
  key: string;
  /** Readable metric name. */
  label: string;
  /** Finite observed value. */
  value: number;
  /** Display unit, such as bytes, ms, /s or %. */
  unit: string;
}
/** Format known units without discarding the original observed value. */
export function formatStatsMetric(value: number, unit: string): string {
  if (unit === "bytes") {
    const abs = Math.abs(value);
    if (abs >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GiB`;
    if (abs >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MiB`;
    if (abs >= 1024) return `${(value / 1024).toFixed(1)} KiB`;
    return `${value} B`;
  }
  if (unit === "%" || unit === "ms" || unit === "/s") return `${value.toLocaleString()}${unit}`;
  return value.toLocaleString();
}
/** Preserve percentage readings and scale other magnitudes relative to the largest observation. */
export function statsGaugePercent(value: number, maximum: number): number {
  if (value >= 0 && value <= 100) return value;
  return Math.min(100, Math.abs(value) / Math.max(1, maximum) * 100);
}
