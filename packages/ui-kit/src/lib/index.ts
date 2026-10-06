// ui-kit is the alias layer over the vendored design system (ADR 0002 /
// Brand ADR 0006 no-flag-day seam): call sites keep importing @reddb-io/ui-kit
// while each export resolves to the DS component when compatible, or to the
// local override when red-ui deliberately diverges (documented per export).
// Since DS 2026.08.2 the Kits ship as one package with a subpath per Kit:
// Kbd is a Base contract, NavItem and SplitView are Application Primitives.
export {
  Kbd,
  LoadingIndicator as LoadingState,
} from "@reddb-io/design-system/base";
export { NavItem, SplitView } from "@reddb-io/design-system/app";
// LoadingState resolves to the DS LoadingIndicator since 2026.10: the DS
// spinner now honours prefers-reduced-motion (it pulses instead of spinning),
// which was the only reason red-ui kept its own.
//
// Local overrides — each is a recorded divergence, reconciled at its own pace
// (Brand ADR 0006: one diff per component, never a silent fork). DS 2026.10
// covers most of the original reasons (feedback tones, Density, Button
// `tone="danger"`); what remains is call-site API and red-ui's own scale:
// - Button: red-ui's `danger` variant, ghost default and denser sizing. The
//   DS Button now has `tone="danger"` and Density; migrating means moving
//   call sites to `tone` + `variant` and accepting the DS geometry.
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
export { default as ListRow } from "./ListRow.svelte";
export { default as SectionHeading } from "./SectionHeading.svelte";
export { default as Pill } from "./Pill.svelte";
export { default as EmptyState } from "./EmptyState.svelte";
export {
  splitViewGridClass,
  isSearchShortcut,
  SPLIT_VIEW_BREAKPOINT_REM,
} from "./split-view";
