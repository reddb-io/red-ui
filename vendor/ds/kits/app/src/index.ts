// The application Kit's public surface.
//
// A Kit is the unit of export routing (ADR 0002): a Product Application
// receives this directory as vendorable source and imports from here. Every
// component below is a Primitive — it imports no other Kit component — which
// is a mechanical property, checked by `test/primitives.test.ts`, not a
// judgement call (.red/CONTEXT.md, Taxonomy).
//
// Each component is exported alongside its `tv()` variants object, because the
// classes are as much of the contract as the element is: a consumer that needs
// a link to look like a Button imports `button` and puts the classes on its
// own <a>, instead of forking the component to change one tag.

export { default as Badge } from "./primitives/Badge.svelte";
export { default as Button } from "./primitives/Button.svelte";
export { default as Card } from "./primitives/Card.svelte";
export { default as EmptyState } from "./primitives/EmptyState.svelte";
export { default as Kbd } from "./primitives/Kbd.svelte";
export { default as ListRow } from "./primitives/ListRow.svelte";
export { default as LoadingState } from "./primitives/LoadingState.svelte";
export { default as NavItem } from "./primitives/NavItem.svelte";
export { default as NodeBadge } from "./primitives/NodeBadge.svelte";
export { default as Pill } from "./primitives/Pill.svelte";
export { default as SectionHeading } from "./primitives/SectionHeading.svelte";
export { default as SplitView } from "./primitives/SplitView.svelte";

export {
  badge,
  BADGE_VARIANTS,
  type BadgeVariant,
} from "./primitives/badge.variants";
export {
  button,
  buttonSpinner,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  type ButtonSize,
  type ButtonVariant,
} from "./primitives/button.variants";
export {
  card,
  CARD_PADDINGS,
  CARD_VARIANTS,
  type CardPadding,
  type CardVariant,
} from "./primitives/card.variants";
export {
  emptyState,
  EMPTY_STATE_SIZES,
  type EmptyStateSize,
} from "./primitives/empty-state.variants";
export {
  kbd,
  kbdChord,
  KBD_SIZES,
  type KbdSize,
} from "./primitives/kbd.variants";
export {
  listRow,
  LIST_ROW_DENSITIES,
  type ListRowDensity,
} from "./primitives/list-row.variants";
export {
  loadingState,
  LOADING_STATE_SIZES,
  type LoadingStateSize,
} from "./primitives/loading-state.variants";
export { navItem } from "./primitives/nav-item.variants";
export {
  nodeBadge,
  NODE_STATUSES,
  type NodeStatus,
} from "./primitives/node-badge.variants";
export {
  pill,
  pillDismiss,
  PILL_SIZES,
  PILL_VARIANTS,
  type PillSize,
  type PillVariant,
} from "./primitives/pill.variants";
export {
  sectionHeading,
  SECTION_HEADING_LEVELS,
  SECTION_HEADING_SIZES,
  type SectionHeadingLevel,
  type SectionHeadingSize,
} from "./primitives/section-heading.variants";
export { splitView } from "./primitives/split-view.variants";

// SplitView's behavior, exported in its own right: an application that builds
// a splitter of its own — a three-pane layout, say — gets the same arithmetic
// rather than writing the clamping again and getting the edges wrong.
export {
  clampFraction,
  fractionAt,
  fractionForKey,
  percentOf,
  separatorOrientation,
  SPLIT_BOUNDS,
  SPLIT_ORIENTATIONS,
  SPLIT_STEP,
  type SplitBounds,
  type SplitOrientation,
} from "./primitives/split-view.behavior";

/**
 * Every Primitive this Kit ships, by component name.
 *
 * Declared rather than discovered, because a consumer reads this list out of
 * vendored source with no bundler glob to run — and pinned against the files
 * on disk by `test/primitives.test.ts`, so it cannot quietly fall behind. The
 * showcase renders one route per entry.
 */
export const PRIMITIVES = [
  "Badge",
  "Button",
  "Card",
  "EmptyState",
  "Kbd",
  "ListRow",
  "LoadingState",
  "NavItem",
  "NodeBadge",
  "Pill",
  "SectionHeading",
  "SplitView",
] as const;

export type PrimitiveName = (typeof PRIMITIVES)[number];
