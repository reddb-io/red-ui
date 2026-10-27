import { CONTENT_STATES, type ContentLoadState } from "./contracts/contentstate";

/** Reserve the viewport in server-rendered CSS, never after a client measurement. */
export function contentStateHeight(height?: number | string): string | undefined {
  if (height === undefined) return undefined;
  if (typeof height === "number") {
    if (!Number.isFinite(height) || height <= 0) throw new RangeError("ContentState height must be positive and finite");
    return `${height}px`;
  }
  const value = height.trim();
  if (!value || /^(?:auto|min-content|max-content|fit-content|initial|inherit|unset|revert|revert-layer)$/.test(value)) {
    throw new RangeError("ContentState height must reserve a definite CSS length");
  }
  return value === "fill" ? "100%" : value;
}

/** Identical semantics and validation for both native adapters. */
export function contentStateSemantics(state: ContentLoadState, label: string, emptyTitle: string, announcement?: string) {
  if (!CONTENT_STATES.includes(state)) throw new Error("ContentState requires loading, ready, empty or error state");
  if (!label.trim()) throw new Error("ContentState requires a nonempty region label");
  return {
    busy: state === "loading",
    message: announcement ?? (state === "error" ? "" : `${label}: ${state === "loading" ? "loading" : state === "ready" ? "loaded" : emptyTitle}`),
  };
}
