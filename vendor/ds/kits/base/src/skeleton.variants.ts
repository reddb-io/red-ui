import { tv, type VariantProps } from "tailwind-variants";

const SHAPE = {
  text: "h-4 w-full rounded-md",
  rectangle: "min-h-[var(--reddb-spatial-control-height-lg)] w-full rounded-md",
  circle: "aspect-square size-12 rounded-full",
  table: "grid w-full overflow-hidden",
  kpi: "grid w-full overflow-hidden",
  bar: "grid w-full overflow-hidden",
  column: "grid w-full overflow-hidden",
  combo: "grid w-full overflow-hidden",
  line: "grid w-full overflow-hidden",
  area: "grid w-full overflow-hidden",
  pie: "aspect-square w-full max-w-[calc(var(--reddb-spatial-control-height-md)*8)]",
  donut: "aspect-square w-full max-w-[calc(var(--reddb-spatial-control-height-md)*8)]",
  radial: "aspect-square w-full max-w-[calc(var(--reddb-spatial-control-height-md)*8)]",
  candlestick: "grid w-full overflow-hidden",
  scatter: "grid w-full overflow-hidden",
  heatmap: "grid w-full overflow-hidden",
  graph: "grid w-full overflow-hidden",
  list: "grid w-full overflow-hidden",
  document: "grid w-full overflow-hidden",
  card: "grid w-full overflow-hidden",
} as const;

export const skeleton = tv({
  base: "relative min-w-0",
  variants: {
    shape: SHAPE,
    animated: { true: "motion-safe:animate-pulse motion-reduce:opacity-75", false: "" },
  },
  compoundVariants: [{ shape: ["text", "rectangle", "circle"], class: "bg-muted" }],
  defaultVariants: { shape: "text", animated: true },
});

export type SkeletonVariants = VariantProps<typeof skeleton>;
export type SkeletonShape = NonNullable<SkeletonVariants["shape"]>;
export const SKELETON_SHAPES = Object.keys(SHAPE) as readonly SkeletonShape[];
