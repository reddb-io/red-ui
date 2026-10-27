import type { SkeletonContract } from "./skeleton";

export const CONTENT_STATES = ["loading", "ready", "empty", "error"] as const;
export type ContentLoadState = (typeof CONTENT_STATES)[number];

/** Caller-owned request state. No fetching, empty-value inference or request timers. */
export interface ContentStateContract extends Omit<SkeletonContract, "label"> {
  /** Current initial-load outcome. The application chooses empty explicitly; zero is valid content. */
  state: ContentLoadState;
  /** Required accessible name of the region in every state. */
  label: string;
  /** Definite height reserved before the request, shared by loading, ready, empty and error. Accepts positive pixels or a CSS length (including Density token calculations); fill means 100% of a bounded parent. Overflow remains keyboard-scrollable. Omitted, content determines height and matching a skeleton shape alone cannot guarantee layout stability. */
  height?: number | string;
  /** Default empty-state title when no empty content is supplied. Defaults to No results. */
  emptyTitle?: string;
  /** Optional explanation beneath the default empty-state title. */
  emptyDescription?: string;
  /** Safe text shown in the default error alert and passed to custom failure content. */
  errorMessage?: string;
  /** Override the live message for the current state; an empty string silences it. Default errors use the alert instead. */
  announcement?: string;
}
