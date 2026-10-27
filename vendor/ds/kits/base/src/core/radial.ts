/** Reading supplied to a custom radial center. */
export interface RadialReading {
  /** Current clamped measurement. */
  value: number;
  /** Normalized progress between zero and one hundred. */
  percent: number;
  /** False for unknown-duration work. */
  determinate: boolean;
}
/** Ring width as a fraction of its outer radius. */
export function ringThickness(value: number): number {
  if (!Number.isFinite(value) || value <= 0 || value >= 1) throw new Error("Ring thickness must be greater than zero and less than one");
  return value;
}
