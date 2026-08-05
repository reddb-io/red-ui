// NodeBadge's styling. See button.variants.ts for the split, the colour rule
// and the spatial rule — under which the dot keeps its own size, because it is
// a mark read at a glance rather than a space between things.
//
// Four statuses and two Theme-declared colours to tell them apart with, so
// colour is deliberately not the whole signal: each status is a pair — which
// token the dot is drawn in, and whether it is filled or hollow. `online` and
// `degraded` share the primary token and differ in fill; `offline` and
// `unknown` share the muted one. Two axes out of one colour family, and a
// Theme can move both without the statuses collapsing into each other.
//
// The status word itself is always in the DOM (see NodeBadge.svelte), which is
// what makes that arrangement safe rather than clever: nothing here is the
// only carrier of the meaning.

import { tv, type VariantProps } from "tailwind-variants";

const STATUS = {
  /** Reachable, and keeping up. */
  online: { dot: "border-primary bg-primary" },
  /** Reachable, and behind — lagging, rebalancing, or under pressure. */
  degraded: { dot: "border-primary bg-transparent" },
  /** Known to the cluster, and not answering. */
  offline: { dot: "border-muted bg-muted" },
  /** The default: no reading yet. */
  unknown: { dot: "border-muted bg-transparent" },
} as const;

const LABELLED = {
  /** The default: the status word is drawn next to the node's name. */
  true: { status: "text-muted" },
  /** Announced, never drawn — for a dense cluster list. */
  false: { status: "sr-only" },
} as const;

export const nodeBadge = tv({
  slots: {
    root: "inline-flex items-center gap-[var(--reddb-spatial-gap-md)] rounded-full border border-muted px-2.5 py-1 text-xs leading-none whitespace-nowrap",
    dot: "size-2 shrink-0 rounded-full border",
    name: "font-mono text-foreground",
    status: "",
  },
  variants: { status: STATUS, labelled: LABELLED },
  defaultVariants: { status: "unknown", labelled: true },
});

export type NodeBadgeVariants = VariantProps<typeof nodeBadge>;
export type NodeStatus = NonNullable<NodeBadgeVariants["status"]>;

export const NODE_STATUSES = Object.keys(STATUS) as readonly NodeStatus[];
