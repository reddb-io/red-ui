/** Normalize linear audio amplitudes without assuming a capture API. */
export function audioLevel(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
/** Keep the most recent bounded signed samples; the caller owns their timing. */
export function audioWaveform(samples: readonly number[]): string {
  const values = samples.slice(-128).map(value => Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0);
  if (!values.length) return "0,50 100,50";
  if (values.length === 1) return `0,${50 - values[0]! * 50} 100,${50 - values[0]! * 50}`;
  return values.map((value, index) => `${index * 100 / (values.length - 1)},${50 - value * 50}`).join(" ");
}
