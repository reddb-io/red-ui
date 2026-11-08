import { type VariantProps } from "tailwind-variants";
/**
 * The figure every LayerChart-powered chart renders (ADR 0013): it bridges each
 * LayerChart variable onto a role the Color Schemes reassign, so a chart
 * re-themes with its Product Surface and never carries a palette of its own.
 *
 * LayerChart paints its marks in `--color-primary`. A measurement is never the
 * Brand red (DESIGN.md), so the figure routes that variable to the Series Role
 * the caller names — series 1 unless told otherwise — and an ancestor that has
 * to repaint a chart on its own ground (a KpiCard tone) still overrides it by
 * the same name. Axis text is set at the type scale's `xs`, never LayerChart's
 * 10px default.
 */
export declare const chartFigure: import("tailwind-variants").TVReturnType<{
    /** The Series Role (1–6) the chart's marks are drawn in. */
    series: {
        1: "[--color-primary:var(--reddb-color-series-1)]";
        2: "[--color-primary:var(--reddb-color-series-2)]";
        3: "[--color-primary:var(--reddb-color-series-3)]";
        4: "[--color-primary:var(--reddb-color-series-4)]";
        5: "[--color-primary:var(--reddb-color-series-5)]";
        6: "[--color-primary:var(--reddb-color-series-6)]";
    };
    /**
     * A fluid chart takes its container's width and never sets it: its drawing
     * is sized from the figure, so letting the drawing widen the figure would
     * feed the measurement back into itself and push a phone layout sideways.
     */
    fluid: {
        true: "contain-inline-size";
        false: "";
    };
}, undefined, string, {
    /** The Series Role (1–6) the chart's marks are drawn in. */
    series: {
        1: "[--color-primary:var(--reddb-color-series-1)]";
        2: "[--color-primary:var(--reddb-color-series-2)]";
        3: "[--color-primary:var(--reddb-color-series-3)]";
        4: "[--color-primary:var(--reddb-color-series-4)]";
        5: "[--color-primary:var(--reddb-color-series-5)]";
        6: "[--color-primary:var(--reddb-color-series-6)]";
    };
    /**
     * A fluid chart takes its container's width and never sets it: its drawing
     * is sized from the figure, so letting the drawing widen the figure would
     * feed the measurement back into itself and push a phone layout sideways.
     */
    fluid: {
        true: "contain-inline-size";
        false: "";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    /** The Series Role (1–6) the chart's marks are drawn in. */
    series: {
        1: "[--color-primary:var(--reddb-color-series-1)]";
        2: "[--color-primary:var(--reddb-color-series-2)]";
        3: "[--color-primary:var(--reddb-color-series-3)]";
        4: "[--color-primary:var(--reddb-color-series-4)]";
        5: "[--color-primary:var(--reddb-color-series-5)]";
        6: "[--color-primary:var(--reddb-color-series-6)]";
    };
    /**
     * A fluid chart takes its container's width and never sets it: its drawing
     * is sized from the figure, so letting the drawing widen the figure would
     * feed the measurement back into itself and push a phone layout sideways.
     */
    fluid: {
        true: "contain-inline-size";
        false: "";
    };
}, undefined>>;
export type ChartFigureVariants = VariantProps<typeof chartFigure>;
