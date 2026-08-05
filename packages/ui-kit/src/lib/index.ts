// ui-kit is the alias layer over the vendored DS application Kit (ADR 0002 /
// Brand ADR 0006 no-flag-day seam): call sites keep importing @reddb-io/ui-kit
// while each export resolves to the DS component when compatible, or to the
// local override when red-ui deliberately diverges (documented per export).
export { Kbd, NavItem, SplitView } from "@reddb-io/kit-app";
// Local overrides — each is a recorded divergence, reconciled at its own pace
// (Brand ADR 0006: one diff per component, never a silent fork):
// - Button: keeps the `danger` variant (Brand ships no feedback colors yet)
//   and red-ui's ghost-default, denser sizing until the DS Density axis lands.
// - LoadingState: red-ui's spinner respects prefers-reduced-motion
//   (motion-safe:); the DS one does not yet — kept local, gap filed upstream.
// - ListRow / SectionHeading / Pill / EmptyState: red-ui's slot/prop APIs
//   (hint, wide, icon+meta, tone, action) drifted from the DS shape; kept
//   local until mapped or upstreamed.
// - Badge (tone) / Card (floating) / NodeBadge (label): same API drift —
//   red-ui call sites use props the DS shapes don't carry; kept local until
//   the call sites migrate to the DS API in their own slice.
export { default as Badge } from "./Badge.svelte";
export { default as Card } from "./Card.svelte";
export { default as NodeBadge } from "./NodeBadge.svelte";
export { default as Button } from "./Button.svelte";
export { default as LoadingState } from "./LoadingState.svelte";
export { default as ListRow } from "./ListRow.svelte";
export { default as SectionHeading } from "./SectionHeading.svelte";
export { default as Pill } from "./Pill.svelte";
export { default as EmptyState } from "./EmptyState.svelte";
export {
  splitViewGridClass,
  isSearchShortcut,
  SPLIT_VIEW_BREAKPOINT_REM,
} from "./split-view";
