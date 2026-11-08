import { type ChartHeight, type ChartLayout, type ChartReadout, type ChartSize } from "./chart";
/** Native adapters share one container-query and Density-aware chart layout. */
export declare const chartSurface: import("tailwind-variants").TVReturnType<{
    fill: {
        true: "h-full";
        false: "";
    };
}, undefined, "@container/chart group/chart relative flex min-h-0 min-w-0 flex-col", {
    fill: {
        true: "h-full";
        false: "";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    fill: {
        true: "h-full";
        false: "";
    };
}, undefined>>;
/** Readout placement never changes the explorer's accessible value. */
export declare function chartReadout(layout: ChartLayout, mode: ChartReadout): string;
/** Default height before measurement; explicit size or height always wins. */
export declare function chartRows(layout: ChartLayout, legacyRows: number, size?: ChartSize): number;
/** CSS reserves the drawing before the optional engine is loaded, including in SSR. */
export declare function chartHeightStyle(layout: ChartLayout, legacyRows: number, size?: ChartSize, height?: ChartHeight): string | undefined;
/** Small containers use six rows; wider surfaces keep the caller's normal geometry. */
export declare function chartAdaptiveHeight(layout: ChartLayout, legacyRows: number, size?: ChartSize, height?: ChartHeight): string;
