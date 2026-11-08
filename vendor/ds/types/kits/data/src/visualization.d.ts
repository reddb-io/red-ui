import { type ColorToken } from "@reddb-io/design-system/base/recipes";
/** Shared, browser-safe contracts. No renderer, layout engine or component registry. */
export type VisualizationSize = "sm" | "md" | "lg";
export type VisualizationSeries = 1 | 2 | 3 | 4 | 5 | 6;
export interface VisualizationItem {
    /** Explicit scheme-aware color custom-property name. */
    color?: ColorToken;
    id: string;
    label: string;
    description?: string;
    series?: VisualizationSeries;
    href?: string;
}
export interface VisualizationRow {
    id: string;
    label: string;
    value: string;
    description?: string;
    href?: string;
}
export declare const ink = "var(--reddb-color-foreground)";
export declare const mutedInk = "var(--reddb-color-ink-muted)";
export declare const edge = "var(--reddb-color-muted)";
export declare const surface = "var(--reddb-color-elevation-raised-surface)";
export declare function seriesColor(series?: VisualizationSeries, color?: ColorToken): string;
export declare function tint(color: string, amount?: number): string;
export declare function unique(items: readonly {
    id: string;
}[], subject: string): void;
export declare function finite(value: number, subject: string): number;
export declare function domain(values: readonly number[], explicit?: readonly [number, number]): [number, number];
export declare function project(value: number, range: readonly [number, number], start: number, end: number): number;
export declare function ticks(range: readonly [number, number], count?: number): number[];
export declare function number(value: number): string;
/** Limit a visible label; its complete text remains in the data table and SVG title. */
export declare function short(value: string, length?: number): string;
