// Pure, framework-free helpers for the `SplitView` shell, kept separate from
// the component so the grid math and the keyboard idiom can be unit-tested
// without mounting Svelte.

/** Container width (in `rem`) at/above which both panes show; below, one column. */
export const SPLIT_VIEW_BREAKPOINT_REM = 52;

/**
 * Tailwind grid-template class for the two-pane shell.
 *
 * - `true`  → always a single column
 * - `false` → always two columns (`13rem | minmax(0,1fr)`)
 * - omitted → responsive: one column below the container breakpoint, two at or
 *   above it (Tailwind v4 container query — the shell measures its own width,
 *   so it collapses in a narrow embed, not just a narrow viewport).
 *
 * Each branch returns a contiguous literal so Tailwind's source scanner emits
 * the utilities — never assemble these class strings via interpolation.
 */
export function splitViewGridClass(collapsed?: boolean): string {
  if (collapsed === true) return "grid-cols-1";
  if (collapsed === false) return "grid-cols-[13rem_minmax(0,1fr)]";
  return "grid-cols-1 @min-[52rem]:grid-cols-[13rem_minmax(0,1fr)]";
}

/**
 * The default "Cmd+K idiom": ⌘K on macOS, Ctrl+K elsewhere, with no Shift or
 * Alt. Returns true when a keydown should focus the inline search (or toggle
 * the search overlay) of a `SplitView`.
 */
export function isSearchShortcut(e: KeyboardEvent): boolean {
  return (
    Boolean(e.metaKey || e.ctrlKey) &&
    !e.shiftKey &&
    !e.altKey &&
    e.key.toLowerCase() === "k"
  );
}
