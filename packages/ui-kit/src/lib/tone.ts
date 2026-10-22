import type { Tone } from "@reddb-io/design-system/base";

/** Compatibility for published ui-kit consumers; new code uses the DS vocabulary. */
export type LegacyTone = Tone | "ok" | "warn" | "accent" | "muted";

export function resolveTone(tone: LegacyTone): Tone {
  if (tone === "ok") return "success";
  if (tone === "warn") return "warning";
  if (tone === "accent" || tone === "muted") return "neutral";
  return tone;
}
