import { type VariantProps } from "tailwind-variants";
export declare const skeleton: import("tailwind-variants").TVReturnType<{
    shape: {
        readonly text: "h-4 w-full rounded-md";
        readonly rectangle: "min-h-[var(--reddb-spatial-control-height-lg)] w-full rounded-md";
        readonly circle: "aspect-square size-12 rounded-full";
        readonly table: "grid w-full overflow-hidden";
        readonly kpi: "grid w-full overflow-hidden";
        readonly bar: "grid w-full overflow-hidden";
        readonly column: "grid w-full overflow-hidden";
        readonly combo: "grid w-full overflow-hidden";
        readonly line: "grid w-full overflow-hidden";
        readonly area: "grid w-full overflow-hidden";
        readonly pie: "aspect-square w-full max-w-[calc(var(--reddb-spatial-control-height-md)*8)]";
        readonly donut: "aspect-square w-full max-w-[calc(var(--reddb-spatial-control-height-md)*8)]";
        readonly radial: "aspect-square w-full max-w-[calc(var(--reddb-spatial-control-height-md)*8)]";
        readonly candlestick: "grid w-full overflow-hidden";
        readonly scatter: "grid w-full overflow-hidden";
        readonly heatmap: "grid w-full overflow-hidden";
        readonly graph: "grid w-full overflow-hidden";
        readonly list: "grid w-full overflow-hidden";
        readonly document: "grid w-full overflow-hidden";
        readonly card: "grid w-full overflow-hidden";
    };
    animated: {
        true: "motion-safe:animate-pulse motion-reduce:opacity-75";
        false: "";
    };
}, undefined, "relative min-w-0", {
    shape: {
        readonly text: "h-4 w-full rounded-md";
        readonly rectangle: "min-h-[var(--reddb-spatial-control-height-lg)] w-full rounded-md";
        readonly circle: "aspect-square size-12 rounded-full";
        readonly table: "grid w-full overflow-hidden";
        readonly kpi: "grid w-full overflow-hidden";
        readonly bar: "grid w-full overflow-hidden";
        readonly column: "grid w-full overflow-hidden";
        readonly combo: "grid w-full overflow-hidden";
        readonly line: "grid w-full overflow-hidden";
        readonly area: "grid w-full overflow-hidden";
        readonly pie: "aspect-square w-full max-w-[calc(var(--reddb-spatial-control-height-md)*8)]";
        readonly donut: "aspect-square w-full max-w-[calc(var(--reddb-spatial-control-height-md)*8)]";
        readonly radial: "aspect-square w-full max-w-[calc(var(--reddb-spatial-control-height-md)*8)]";
        readonly candlestick: "grid w-full overflow-hidden";
        readonly scatter: "grid w-full overflow-hidden";
        readonly heatmap: "grid w-full overflow-hidden";
        readonly graph: "grid w-full overflow-hidden";
        readonly list: "grid w-full overflow-hidden";
        readonly document: "grid w-full overflow-hidden";
        readonly card: "grid w-full overflow-hidden";
    };
    animated: {
        true: "motion-safe:animate-pulse motion-reduce:opacity-75";
        false: "";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    shape: {
        readonly text: "h-4 w-full rounded-md";
        readonly rectangle: "min-h-[var(--reddb-spatial-control-height-lg)] w-full rounded-md";
        readonly circle: "aspect-square size-12 rounded-full";
        readonly table: "grid w-full overflow-hidden";
        readonly kpi: "grid w-full overflow-hidden";
        readonly bar: "grid w-full overflow-hidden";
        readonly column: "grid w-full overflow-hidden";
        readonly combo: "grid w-full overflow-hidden";
        readonly line: "grid w-full overflow-hidden";
        readonly area: "grid w-full overflow-hidden";
        readonly pie: "aspect-square w-full max-w-[calc(var(--reddb-spatial-control-height-md)*8)]";
        readonly donut: "aspect-square w-full max-w-[calc(var(--reddb-spatial-control-height-md)*8)]";
        readonly radial: "aspect-square w-full max-w-[calc(var(--reddb-spatial-control-height-md)*8)]";
        readonly candlestick: "grid w-full overflow-hidden";
        readonly scatter: "grid w-full overflow-hidden";
        readonly heatmap: "grid w-full overflow-hidden";
        readonly graph: "grid w-full overflow-hidden";
        readonly list: "grid w-full overflow-hidden";
        readonly document: "grid w-full overflow-hidden";
        readonly card: "grid w-full overflow-hidden";
    };
    animated: {
        true: "motion-safe:animate-pulse motion-reduce:opacity-75";
        false: "";
    };
}, undefined>>;
export type SkeletonVariants = VariantProps<typeof skeleton>;
export type SkeletonShape = NonNullable<SkeletonVariants["shape"]>;
export declare const SKELETON_SHAPES: readonly SkeletonShape[];
